# Rust Project Conventions

Include these constraints when delegating to agents in Rust projects:

1. **Conventional Commits** — every commit: `<type>(<scope>): <desc> (#N)`
2. **English comments only** — all code comments, doc comments, string literals in English
3. **Doc comments on public items** — `///` for every `pub fn`, `pub struct`, `pub enum`, `pub trait`
4. **snafu for errors** — no manual `impl Display + impl Error`
5. **No noop trait impls** — trait methods must have real implementations (except optional UX hooks)
6. **No hardcoded defaults** — configuration comes from YAML, not Rust code
7. **AGENT.md for new crates** — every new crate ships with agent guidelines

## Verification Commands

```bash
cargo check -p {crate-name}
cargo +nightly fmt --check
cargo clippy -- -D warnings
just pre-commit
```

Allowed commit types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`,
`perf`, `style`, `build`, `revert`.
