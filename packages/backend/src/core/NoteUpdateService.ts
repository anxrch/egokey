import { setImmediate } from 'node:timers/promises';
import { In } from 'typeorm';
import { Injectable, Inject, OnApplicationShutdown } from '@nestjs/common';
import type { MiUser, MiLocalUser, MiRemoteUser } from '@/models/User.js';
import type { IMentionedRemoteUsers, MiNote } from '@/models/Note.js';
import type { InstancesRepository, NotesRepository, UsersRepository } from '@/models/_.js';
import { RelayService } from '@/core/RelayService.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import NotesChart from '@/core/chart/charts/notes.js';
import PerUserNotesChart from '@/core/chart/charts/per-user-notes.js';
import InstanceChart from '@/core/chart/charts/instance.js';
import ActiveUsersChart from '@/core/chart/charts/active-users.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { ApDeliverManagerService } from '@/core/activitypub/ApDeliverManagerService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { bindThis } from '@/decorators.js';
import { DB_MAX_NOTE_TEXT_LENGTH } from '@/const.js';
import { MetaService } from '@/core/MetaService.js';
import { SearchService } from '@/core/SearchService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { FanoutTimelineService } from '@/core/FanoutTimelineService.js';

type Option = {
	cw?: string | null;
	text?: string | null;
	visibility?: string;
	updatedAt: Date;
};

@Injectable()
export class NoteUpdateService implements OnApplicationShutdown {
	#shutdownController = new AbortController();

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,

		private userEntityService: UserEntityService,
		private noteEntityService: NoteEntityService,
		private globalEventService: GlobalEventService,
		private relayService: RelayService,
		private federatedInstanceService: FederatedInstanceService,
		private apRendererService: ApRendererService,
		private apDeliverManagerService: ApDeliverManagerService,
		private metaService: MetaService,
		private searchService: SearchService,
		private moderationLogService: ModerationLogService,
		private notesChart: NotesChart,
		private perUserNotesChart: PerUserNotesChart,
		private instanceChart: InstanceChart,
		private activeUsersChart: ActiveUsersChart,
		private fanoutTimelineService: FanoutTimelineService,
	) { }

	@bindThis
	public async update(user: {
		id: MiUser['id'];
		uri: MiUser['uri'];
		host: MiUser['host'];
		username: MiUser['username'];
		isBot: MiUser['isBot'];
	}, note: MiNote, data: Option, silent = false, updater?: MiUser): Promise<MiNote> {
		this.globalEventService.publishNoteStream(note.id, 'updated', data);

		if (data.visibility !== undefined) {
			await this.updateVisibilityCascadingNotes(note, data);
		}

		if (data.text) {
			if (data.text.length > DB_MAX_NOTE_TEXT_LENGTH) {
				data.text = data.text.slice(0, DB_MAX_NOTE_TEXT_LENGTH);
			}
			data.text = data.text.trim();
		}

		const updatedNote = await this.updateNote(note, data);

		setImmediate('post updating', { signal: this.#shutdownController.signal }).then(
			() => this.postNoteUpdated(updatedNote, user, silent),
			() => { /* aborted, ignore this */ },
		);

		// Update redis timeline
		if (data.visibility !== undefined) {
			if (data.visibility !== 'public') {
				const meta = await this.metaService.fetch();
				if (meta.enableFanoutTimeline) {
					this.fanoutTimelineService.remove('localTimeline', note.id);
					this.fanoutTimelineService.remove('localTimelineWithFiles', note.id);
					this.fanoutTimelineService.remove('localTimelineWithReplies', note.id);
				}
			}

			if (updater && (note.userId !== updater.id)) {
				const user = await this.usersRepository.findOneByOrFail({ id: note.userId });
				this.moderationLogService.log(updater, 'updateNote', {
					noteId: note.id,
					noteUserId: note.userId,
					noteUserUsername: user.username,
					noteUserHost: user.host,
					note: note,
				});
			}
		}

		return updatedNote;
	}

	@bindThis
	private async updateNote(note: MiNote, data: Option): Promise<MiNote> {
		const update = {
			cw: data.cw === null ? null : data.cw?.trim() ?? undefined,
			text: data.text ?? undefined,
			visibility: data.visibility ?? undefined,
			updatedAt: data.updatedAt,
		};

		try {
			await this.notesRepository.update({ id: note.id }, update as any);

			return await this.notesRepository.findOneByOrFail({ id: note.id });
		} catch (e) {
			console.error(e);

			throw e;
		}
	}

	@bindThis
	private async postNoteUpdated(note: MiNote, user: {
		id: MiUser['id'];
		uri: MiUser['uri'];
		host: MiUser['host'];
		username: MiUser['username'];
		isBot: MiUser['isBot'];
	}, silent: boolean) {
		if (!silent) {
			if (this.userEntityService.isLocalUser(user)) this.activeUsersChart.write(user);

			//#region AP deliver
			if (this.userEntityService.isLocalUser(user)) {
				(async () => {
					const noteActivity = await this.renderNoteActivity(user, note);

					// Skip deliver if local only notes
					if (noteActivity === null) {
						return;
					}

					this.deliverToConcerned(user, note, noteActivity);
				})();
			}
			//#endregion
		}

		this.reindex(note);
	}

	@bindThis
	private async deliverToConcerned(user: { id: MiLocalUser['id']; host: null; }, note: MiNote, content: any) {
		this.apDeliverManagerService.deliverToFollowers(user, content);
		this.relayService.deliverToRelays(user, content);
		const remoteUsers = await this.getMentionedRemoteUsers(note);
		for (const remoteUser of remoteUsers) {
			this.apDeliverManagerService.deliverToUser(user, content, remoteUser);
		}
	}

	@bindThis
	private async renderNoteActivity(user: { id: MiLocalUser['id']; }, note: MiNote) {
		if (note.localOnly) return null;

		const content = this.apRendererService.renderUpdate(await this.apRendererService.renderNote(note, false), user);

		return this.apRendererService.addContext(content);
	}

	@bindThis
	private async getMentionedRemoteUsers(note: MiNote) {
		const where = [] as any[];

		// mention / reply / dm
		const uris = (JSON.parse(note.mentionedRemoteUsers) as IMentionedRemoteUsers).map(x => x.uri);
		if (uris.length > 0) {
			where.push(
				{ uri: In(uris) },
			);
		}

		// renote / quote
		if (note.renoteUserId) {
			where.push({
				id: note.renoteUserId,
			});
		}

		if (where.length === 0) return [];

		return await this.usersRepository.find({
			where,
		}) as MiRemoteUser[];
	}

	@bindThis
	private async updateVisibilityCascadingNotes(note: MiNote, data: Option): Promise<void> {
		const cascadingNotes = await this.findCascadingNotes(note);

		for (const cascadingNote of cascadingNotes) {
			if (cascadingNote.visibility === 'public' && data.visibility !== 'public') {
				this.globalEventService.publishNoteStream(cascadingNote.id, 'updated', {
					visibility: data.visibility,
					updatedAt: data.updatedAt,
				});

				await this.notesRepository.update({
					id: cascadingNote.id,
				}, {
					visibility: data.visibility as any,
					updatedAt: data.updatedAt,
				});
			}
		}
	}

	@bindThis
	private async findCascadingNotes(note: MiNote): Promise<MiNote[]> {
		const recursive = async (noteId: string): Promise<MiNote[]> => {
			const query = this.notesRepository.createQueryBuilder('note')
				.where('note.replyId = :noteId', { noteId })
				.orWhere('note.renoteId = :noteId', { noteId })
				.leftJoinAndSelect('note.user', 'user');
			const replies = await query.getMany();

			return [
				replies,
				...await Promise.all(replies.map(reply => recursive(reply.id))),
			].flat();
		};

		const cascadingNotes: MiNote[] = await recursive(note.id);

		return cascadingNotes;
	}

	@bindThis
	private reindex(note: MiNote) {
		if (note.text == null && note.cw == null) return;

		this.searchService.unindexNote(note);
		this.searchService.indexNote(note);
	}

	@bindThis
	public dispose(): void {
		this.#shutdownController.abort();
	}

	@bindThis
	public onApplicationShutdown(signal?: string | undefined): void {
		this.dispose();
	}
}
