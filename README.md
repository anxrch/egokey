<div align="center">
  <a href="https://github.com/anxrch/egokey">
    <img src="./packages/frontend/assets/egokey.svg" alt="EgoKey logo" width="300" />
  </a>

  **EgoKey is a free, open-source, federated social-media platform.**

  [Repository](https://github.com/anxrch/egokey) · [Issues](https://github.com/anxrch/egokey/issues) · [Releases](https://github.com/anxrch/egokey/releases) · [Contributing](./CONTRIBUTING.md)
</div>

## Run EgoKey

For a production deployment, copy the supplied Docker configuration, set the instance URL and database credentials, then start the service with Docker Compose. The release image is published to `ghcr.io/anxrch/egokey`.

```sh
cp .config/docker_example.yml .config/default.yml
cp .config/docker_example.env .config/docker.env
cp compose_example.yml compose.yml
docker compose up -d
```

See [the configuration example](./.config/example.yml) for all available settings.

## Development

EgoKey requires Redis, PostgreSQL, and FFmpeg. The [contribution guide](./CONTRIBUTING.md) covers local setup, testing, and release expectations.

## Attribution and licensing

EgoKey is distributed under the AGPL-3.0-only license. See [COPYING](./COPYING) and the included third-party notices for complete licensing and attribution information.
