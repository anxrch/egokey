#!/usr/bin/env node

/**
 * Integrity Report Generator
 * 
 * Generates comprehensive repository integrity reports by:
 * - Gathering system and environment metadata
 * - Compiling check outcomes from logs
 * - Parsing security audit findings
 * - Summarizing test coverage and artifacts
 * - Creating timestamped Markdown reports
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = resolve(__filename, '../..');
const logsDir = join(projectRoot, 'reports', 'integrity-logs');
const reportsDir = join(projectRoot, 'reports');

// Ensure reports directory exists
if (!existsSync(reportsDir)) {
	mkdirSync(reportsDir, { recursive: true });
}

/**
 * Execute a command and return output, or return error message
 */
function exec(command, options = {}) {
	try {
		return execSync(command, { 
			encoding: 'utf8', 
			cwd: projectRoot,
			stdio: ['pipe', 'pipe', 'pipe'],
			...options 
		}).trim();
	} catch (error) {
		return `Error: ${error.message}`;
	}
}

/**
 * Read file content safely
 */
function readFileSafe(filepath) {
	try {
		return readFileSync(filepath, 'utf8');
	} catch {
		return null;
	}
}

/**
 * Get file size in human-readable format
 */
function getFileSize(filepath) {
	try {
		const stats = statSync(filepath);
		const bytes = stats.size;
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	} catch {
		return 'N/A';
	}
}

/**
 * Parse log file to extract outcome, duration, and error info
 */
function parseLogFile(logPath) {
	const content = readFileSafe(logPath);
	if (!content) {
		return {
			status: '⏭️',
			statusText: 'SKIPPED',
			duration: 'N/A',
			errors: [],
			size: 'N/A'
		};
	}

	const lines = content.split('\n');
	let hasErrors = false;
	let hasFailure = false;
	let duration = 'N/A';
	const errors = [];

	// Look for common failure patterns
	const failurePatterns = [
		/error:/i,
		/failed/i,
		/\d+ failing/i,
		/TS\d+:/,
		/✗|✖|❌/,
		/FAIL/,
		/ERROR/
	];

	const successPatterns = [
		/success/i,
		/passed/i,
		/✓|✔|✅/,
		/PASS/,
		/OK/
	];

	// Extract errors and detect failure
	for (let i = 0; i < Math.min(lines.length, 1000); i++) {
		const line = lines[i];
		
		// Check for failures
		for (const pattern of failurePatterns) {
			if (pattern.test(line)) {
				hasFailure = true;
				if (errors.length < 10 && line.trim().length > 0) {
					errors.push(line.trim());
				}
			}
		}

		// Look for duration
		const timeMatch = line.match(/(?:time|duration|took|elapsed):\s*(\d+(?:\.\d+)?)\s*(ms|s|m)/i);
		if (timeMatch) {
			duration = `${timeMatch[1]}${timeMatch[2]}`;
		}
	}

	// Check for success indicators
	let hasSuccess = false;
	for (const pattern of successPatterns) {
		if (pattern.test(content)) {
			hasSuccess = true;
			break;
		}
	}

	const status = hasFailure ? '❌' : hasSuccess ? '✅' : '⚠️';
	const statusText = hasFailure ? 'FAILED' : hasSuccess ? 'PASSED' : 'PARTIAL';

	return {
		status,
		statusText,
		duration,
		errors: errors.slice(0, 5),
		size: getFileSize(logPath)
	};
}

/**
 * Gather environment metadata
 */
function gatherMetadata() {
	const metadata = {
		// Git information
		commitSHA: exec('git rev-parse HEAD'),
		commitShort: exec('git rev-parse --short HEAD'),
		branch: exec('git rev-parse --abbrev-ref HEAD'),
		
		// Timestamps
		runDate: new Date().toISOString().split('T')[0],
		runTime: new Date().toISOString(),
		runTimestamp: Date.now(),
		
		// System information
		os: exec('uname -s'),
		osVersion: exec('uname -r'),
		arch: exec('uname -m'),
		hostname: exec('hostname'),
		
		// Tool versions
		nodeVersion: exec('node -v'),
		pnpmVersion: exec('pnpm -v'),
		
		// Service versions (Docker-based)
		postgresVersion: exec('docker exec $(docker ps -q -f name=postgres 2>/dev/null | head -1) psql --version 2>/dev/null || echo "N/A"'),
		redisVersion: exec('docker exec $(docker ps -q -f name=redis 2>/dev/null | head -1) redis-cli --version 2>/dev/null || echo "N/A"'),
		
		// Check for ffmpeg
		ffmpegVersion: exec('ffmpeg -version 2>/dev/null | head -1 || echo "N/A"'),
		
		// Git status
		gitStatus: exec('git status --porcelain | wc -l'),
		lastCommitDate: exec('git log -1 --format=%ci'),
		lastCommitMessage: exec('git log -1 --format=%s'),
		lastCommitAuthor: exec('git log -1 --format=%an'),
	};

	return metadata;
}

/**
 * Parse pnpm-audit.json for security findings
 */
function parseSecurityAudit() {
	const auditPath = join(logsDir, 'pnpm-audit.json');
	const auditContent = readFileSafe(auditPath);
	
	if (!auditContent) {
		return {
			total: 0,
			bySeverity: { low: 0, moderate: 0, high: 0, critical: 0 },
			vulnerabilities: []
		};
	}

	try {
		const audit = JSON.parse(auditContent);
		const vulnerabilities = [];
		const bySeverity = { low: 0, moderate: 0, high: 0, critical: 0 };

		if (audit.advisories) {
			for (const [id, advisory] of Object.entries(audit.advisories)) {
				const severity = advisory.severity || 'unknown';
				bySeverity[severity] = (bySeverity[severity] || 0) + 1;

				vulnerabilities.push({
					id,
					title: advisory.title,
					module: advisory.module_name,
					severity: severity,
					cves: advisory.cves || [],
					vulnerable_versions: advisory.vulnerable_versions,
					patched_versions: advisory.patched_versions,
					recommendation: advisory.recommendation,
					overview: advisory.overview,
					paths: advisory.findings?.map(f => f.paths).flat() || []
				});
			}
		}

		return {
			total: vulnerabilities.length,
			bySeverity,
			vulnerabilities: vulnerabilities.sort((a, b) => {
				const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
				return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
			})
		};
	} catch (error) {
		return {
			total: 0,
			bySeverity: { low: 0, moderate: 0, high: 0, critical: 0 },
			vulnerabilities: [],
			error: error.message
		};
	}
}

/**
 * Scan logs directory for all check logs
 */
function scanCheckLogs() {
	const checks = [];
	
	if (!existsSync(logsDir)) {
		return checks;
	}

	const logFiles = readdirSync(logsDir)
		.filter(f => f.endsWith('.log'))
		.sort();

	const checkMapping = {
		'install': { name: 'Dependency Installation', category: 'dependencies' },
		'audit': { name: 'Security Audit', category: 'security' },
		'doctor': { name: 'Environment Health Check', category: 'dependencies' },
		'typecheck': { name: 'Type Checking', category: 'static-analysis' },
		'lint': { name: 'Linting', category: 'static-analysis' },
		'build': { name: 'Build Process', category: 'build' },
		'connectivity': { name: 'Service Connectivity', category: 'infrastructure' },
		'migration': { name: 'Database Migrations', category: 'database' },
		'backend-test': { name: 'Backend Unit Tests', category: 'tests' },
		'frontend-test': { name: 'Frontend Tests', category: 'tests' },
		'sdk-test': { name: 'SDK Tests', category: 'tests' },
		'e2e': { name: 'E2E Tests', category: 'tests' },
		'cypress': { name: 'Cypress Tests', category: 'tests' },
	};

	for (const logFile of logFiles) {
		const logPath = join(logsDir, logFile);
		const result = parseLogFile(logPath);
		
		// Try to match check name
		let checkName = basename(logFile, '.log');
		let displayName = checkName;
		let category = 'other';

		for (const [key, config] of Object.entries(checkMapping)) {
			if (checkName.includes(key)) {
				displayName = config.name;
				category = config.category;
				break;
			}
		}

		checks.push({
			name: checkName,
			displayName,
			category,
			logFile,
			...result
		});
	}

	return checks;
}

/**
 * Generate status summary table
 */
function generateStatusTable(checks) {
	const rows = [
		'| Check | Status | Duration | Log File |',
		'|-------|--------|----------|----------|'
	];

	for (const check of checks) {
		const logLink = `[${check.logFile}](integrity-logs/${check.logFile})`;
		rows.push(`| ${check.displayName} | ${check.status} ${check.statusText} | ${check.duration} | ${logLink} |`);
	}

	return rows.join('\n');
}

/**
 * Generate security findings section
 */
function generateSecuritySection(audit) {
	const lines = [];
	
	lines.push('## Security Audit');
	lines.push('');
	
	if (audit.error) {
		lines.push(`⚠️ **Error parsing audit data**: ${audit.error}`);
		lines.push('');
		return lines.join('\n');
	}

	lines.push(`**Total Vulnerabilities**: ${audit.total}`);
	lines.push('');
	lines.push('### By Severity');
	lines.push('');
	lines.push(`- 🔴 **Critical**: ${audit.bySeverity.critical}`);
	lines.push(`- 🟠 **High**: ${audit.bySeverity.high}`);
	lines.push(`- 🟡 **Moderate**: ${audit.bySeverity.moderate}`);
	lines.push(`- 🟢 **Low**: ${audit.bySeverity.low}`);
	lines.push('');

	if (audit.vulnerabilities.length > 0) {
		lines.push('### Critical & High Severity Vulnerabilities');
		lines.push('');

		const critical = audit.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high');
		
		if (critical.length === 0) {
			lines.push('✅ No critical or high severity vulnerabilities found.');
			lines.push('');
		} else {
			for (const vuln of critical.slice(0, 10)) {
				const severityIcon = vuln.severity === 'critical' ? '🔴' : '🟠';
				lines.push(`#### ${severityIcon} ${vuln.title}`);
				lines.push('');
				lines.push(`- **Module**: \`${vuln.module}\``);
				lines.push(`- **Severity**: ${vuln.severity.toUpperCase()}`);
				if (vuln.cves.length > 0) {
					lines.push(`- **CVEs**: ${vuln.cves.join(', ')}`);
				}
				lines.push(`- **Vulnerable Versions**: \`${vuln.vulnerable_versions}\``);
				lines.push(`- **Patched Versions**: \`${vuln.patched_versions}\``);
				lines.push(`- **Recommendation**: ${vuln.recommendation}`);
				if (vuln.paths.length > 0) {
					lines.push(`- **Affected Paths**: ${vuln.paths.slice(0, 3).map(p => `\`${p}\``).join(', ')}`);
				}
				lines.push('');
			}
		}
	}

	return lines.join('\n');
}

/**
 * Generate recommendations section
 */
function generateRecommendations(checks, audit) {
	const lines = [];
	
	lines.push('## Issues & Recommendations');
	lines.push('');

	const failed = checks.filter(c => c.statusText === 'FAILED');
	const partial = checks.filter(c => c.statusText === 'PARTIAL');

	if (failed.length === 0 && partial.length === 0 && audit.total === 0) {
		lines.push('✅ **All checks passed successfully!** No immediate action required.');
		lines.push('');
		return lines.join('\n');
	}

	lines.push('### Priority 1 - Critical Issues');
	lines.push('');

	if (audit.bySeverity.critical > 0 || audit.bySeverity.high > 0) {
		lines.push('1. **Security Vulnerabilities**: Address critical and high severity vulnerabilities');
		const highSeverity = audit.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high');
		for (const vuln of highSeverity.slice(0, 3)) {
			lines.push(`   - Update \`${vuln.module}\` to ${vuln.patched_versions}`);
		}
		lines.push('');
	}

	if (failed.length > 0) {
		lines.push('2. **Failed Checks**: The following checks failed and require immediate attention:');
		for (const check of failed) {
			lines.push(`   - ${check.displayName} - See [${check.logFile}](integrity-logs/${check.logFile})`);
			if (check.errors.length > 0) {
				lines.push(`     - ${check.errors[0]}`);
			}
		}
		lines.push('');
	}

	if (partial.length > 0) {
		lines.push('### Priority 2 - Partial Failures');
		lines.push('');
		for (const check of partial) {
			lines.push(`- **${check.displayName}**: Review [${check.logFile}](integrity-logs/${check.logFile}) for warnings`);
		}
		lines.push('');
	}

	lines.push('### Priority 3 - Maintenance');
	lines.push('');
	lines.push('- Run `pnpm update` to update dependencies to latest compatible versions');
	lines.push('- Review and address linting warnings');
	lines.push('- Ensure all tests pass consistently');
	lines.push('- Keep documentation up to date');
	lines.push('');

	return lines.join('\n');
}

/**
 * Generate the complete integrity report
 */
function generateReport(metadata, checks, audit) {
	const lines = [];
	
	// Header
	lines.push(`# Misskey Repository Integrity Report`);
	lines.push('');
	lines.push(`**Generated**: ${metadata.runTime}`);
	lines.push(`**Report Date**: ${metadata.runDate}`);
	lines.push('');

	// Overview
	lines.push('## Overview');
	lines.push('');
	lines.push('This report provides a comprehensive summary of repository health, including dependency integrity, static analysis, build verification, testing, database migrations, and security audits.');
	lines.push('');

	const passedCount = checks.filter(c => c.statusText === 'PASSED').length;
	const failedCount = checks.filter(c => c.statusText === 'FAILED').length;
	const partialCount = checks.filter(c => c.statusText === 'PARTIAL').length;
	const skippedCount = checks.filter(c => c.statusText === 'SKIPPED').length;

	lines.push(`- **Total Checks**: ${checks.length}`);
	lines.push(`- **Passed**: ✅ ${passedCount}`);
	lines.push(`- **Failed**: ❌ ${failedCount}`);
	lines.push(`- **Partial**: ⚠️ ${partialCount}`);
	lines.push(`- **Skipped**: ⏭️ ${skippedCount}`);
	lines.push('');

	// Environment
	lines.push('## Environment');
	lines.push('');
	lines.push('### Git Information');
	lines.push('');
	lines.push(`- **Branch**: \`${metadata.branch}\``);
	lines.push(`- **Commit**: \`${metadata.commitSHA}\``);
	lines.push(`- **Commit Date**: ${metadata.lastCommitDate}`);
	lines.push(`- **Last Commit**: ${metadata.lastCommitMessage}`);
	lines.push(`- **Author**: ${metadata.lastCommitAuthor}`);
	lines.push(`- **Uncommitted Changes**: ${metadata.gitStatus === '0' ? 'None' : metadata.gitStatus + ' files'}`);
	lines.push('');

	lines.push('### System Information');
	lines.push('');
	lines.push(`- **OS**: ${metadata.os} ${metadata.osVersion}`);
	lines.push(`- **Architecture**: ${metadata.arch}`);
	lines.push(`- **Hostname**: ${metadata.hostname}`);
	lines.push('');

	lines.push('### Tool Versions');
	lines.push('');
	lines.push(`- **Node.js**: ${metadata.nodeVersion}`);
	lines.push(`- **pnpm**: ${metadata.pnpmVersion}`);
	lines.push('');

	lines.push('### Service Versions');
	lines.push('');
	lines.push(`- **PostgreSQL**: ${metadata.postgresVersion}`);
	lines.push(`- **Redis**: ${metadata.redisVersion}`);
	lines.push(`- **ffmpeg**: ${metadata.ffmpegVersion}`);
	lines.push('');

	// Status Table
	lines.push('## Check Results Summary');
	lines.push('');
	lines.push(generateStatusTable(checks));
	lines.push('');

	// Detailed Results by Category
	const categories = {
		'dependencies': 'Dependency Integrity',
		'static-analysis': 'Static Analysis',
		'build': 'Build Verification',
		'infrastructure': 'Infrastructure',
		'database': 'Database Migrations',
		'tests': 'Tests',
		'security': 'Security',
		'other': 'Other Checks'
	};

	for (const [catKey, catName] of Object.entries(categories)) {
		const catChecks = checks.filter(c => c.category === catKey);
		if (catChecks.length === 0) continue;

		lines.push(`## ${catName}`);
		lines.push('');

		for (const check of catChecks) {
			lines.push(`### ${check.status} ${check.displayName}`);
			lines.push('');
			lines.push(`- **Status**: ${check.statusText}`);
			lines.push(`- **Duration**: ${check.duration}`);
			lines.push(`- **Log**: [${check.logFile}](integrity-logs/${check.logFile}) (${check.size})`);
			
			if (check.errors.length > 0) {
				lines.push('');
				lines.push('**Errors/Warnings**:');
				lines.push('```');
				for (const error of check.errors) {
					lines.push(error);
				}
				lines.push('```');
			}
			
			lines.push('');
		}
	}

	// Security Section
	lines.push(generateSecuritySection(audit));

	// Testing Artifacts
	lines.push('## Testing Artifacts');
	lines.push('');
	
	const coverageNote = existsSync(join(projectRoot, 'coverage'))
		? '✅ Coverage reports generated in `coverage/` directory'
		: '⚠️ No coverage directory found';
	
	const cypressNote = existsSync(join(projectRoot, 'cypress', 'videos'))
		? '✅ Cypress videos available in `cypress/videos/`'
		: 'ℹ️ No Cypress videos found';

	lines.push(`- **Coverage**: ${coverageNote}`);
	lines.push(`- **Cypress Assets**: ${cypressNote}`);
	lines.push('');

	// Recommendations
	lines.push(generateRecommendations(checks, audit));

	// Artifacts
	lines.push('## Generated Artifacts');
	lines.push('');
	lines.push('All detailed logs and reports are available in the `reports/integrity-logs/` directory:');
	lines.push('');

	if (existsSync(logsDir)) {
		const logFiles = readdirSync(logsDir).sort();
		for (const file of logFiles) {
			const size = getFileSize(join(logsDir, file));
			lines.push(`- [${file}](integrity-logs/${file}) (${size})`);
		}
	}

	lines.push('');

	// Conclusion
	lines.push('## Conclusion');
	lines.push('');

	const overallStatus = failedCount === 0 && audit.bySeverity.critical === 0 && audit.bySeverity.high === 0
		? '✅ **PASS**'
		: failedCount > 0
		? '❌ **FAIL**'
		: '⚠️ **PASS WITH WARNINGS**';

	lines.push(`**Overall Status**: ${overallStatus}`);
	lines.push('');

	if (failedCount > 0) {
		lines.push(`The repository has ${failedCount} failed check(s) that require attention before deployment.`);
	} else if (audit.bySeverity.high > 0) {
		lines.push('The repository builds and tests successfully, but has security vulnerabilities that should be addressed.');
	} else if (partialCount > 0) {
		lines.push('The repository is functional with minor warnings that should be reviewed.');
	} else {
		lines.push('The repository is in excellent health with all checks passing!');
	}

	lines.push('');
	lines.push('---');
	lines.push('');
	lines.push('*This report was automatically generated by the Misskey integrity check system.*');
	lines.push('');

	return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
	console.log('🔍 Generating Integrity Report...\n');

	// Gather all data
	console.log('📊 Gathering metadata...');
	const metadata = gatherMetadata();

	console.log('📋 Scanning check logs...');
	const checks = scanCheckLogs();

	console.log('🔒 Parsing security audit...');
	const audit = parseSecurityAudit();

	console.log('📝 Generating report...\n');
	const report = generateReport(metadata, checks, audit);

	// Save report with timestamp
	const timestamp = metadata.runDate;
	const reportFilename = `integrity-report-${timestamp}.md`;
	const reportPath = join(reportsDir, reportFilename);

	writeFileSync(reportPath, report, 'utf8');

	// Also create a symlink/copy as "latest"
	const latestPath = join(reportsDir, 'INTEGRITY_REPORT_LATEST.md');
	writeFileSync(latestPath, report, 'utf8');

	console.log('✅ Report generated successfully!\n');
	console.log(`📄 Report saved to: ${reportPath}`);
	console.log(`📄 Latest copy: ${latestPath}`);
	console.log('');
	console.log('Summary:');
	console.log(`  - Total Checks: ${checks.length}`);
	console.log(`  - Passed: ${checks.filter(c => c.statusText === 'PASSED').length}`);
	console.log(`  - Failed: ${checks.filter(c => c.statusText === 'FAILED').length}`);
	console.log(`  - Security Vulnerabilities: ${audit.total}`);
	console.log(`    - Critical: ${audit.bySeverity.critical}`);
	console.log(`    - High: ${audit.bySeverity.high}`);
	console.log('');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { gatherMetadata, scanCheckLogs, parseSecurityAudit, generateReport };
