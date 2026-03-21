import type { FastifyReply } from "fastify";

export function sendNotImplemented(reply: FastifyReply, message: string) {
  return reply.code(501).send({
    code: "NOT_IMPLEMENTED",
    message,
  });
}
