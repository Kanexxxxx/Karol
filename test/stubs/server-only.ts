// Stub de `server-only` para os testes.
//
// O pacote real lança se for importado fora de um Server Component. Nos
// testes (ambiente node, sem o runtime do Next) isso derruba a suíte, então
// o vitest.config.ts aponta `server-only` para cá.
export {};
