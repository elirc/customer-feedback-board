export class BoardError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "BoardError";
  }
}
export function insist(
  ok: unknown,
  status: number,
  message: string,
): asserts ok {
  if (!ok) throw new BoardError(status, message);
}
