/**
 * A tiny in-process SMTP server for invite-email tests. It speaks just
 * enough of the protocol for nodemailer to reach MAIL FROM / RCPT TO, so
 * provider failures can be reproduced exactly as nodemailer reports them
 * — without a network dependency and without ever sending real mail.
 */
import net from "node:net";

export type SmtpMockBehaviour = {
  /** Reject AUTH with a 535 (wrong password / no App Password). */
  authFail?: boolean;
  /** Reject MAIL FROM with a 553 (sender not allowed). */
  senderFail?: boolean;
  /** Reject RCPT TO with a 550 (recipient refused). */
  recipientFail?: boolean;
};

export type SmtpMock = {
  port: number;
  /** Everything the client actually transmitted, for assertion on. */
  received: string[];
  close: () => Promise<void>;
};

export function startSmtpMock(behaviour: SmtpMockBehaviour = {}): Promise<SmtpMock> {
  const received: string[] = [];

  return new Promise((resolve) => {
    const sockets = new Set<net.Socket>();

    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.on("error", () => {});
      socket.on("close", () => sockets.delete(socket));

      let buffer = "";
      const send = (line: string) => socket.write(line + "\r\n");
      send("220 mock ESMTP ready");

      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        let index: number;
        while ((index = buffer.indexOf("\r\n")) !== -1) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          received.push(line);
          const cmd = line.toUpperCase();

          if (cmd.startsWith("EHLO") || cmd.startsWith("HELO")) {
            send("250-mock");
            send("250-AUTH PLAIN LOGIN");
            send("250 OK");
          } else if (cmd.startsWith("AUTH")) {
            if (behaviour.authFail) send("535 5.7.8 Username and Password not accepted");
            else send("235 2.7.0 Authentication successful");
          } else if (cmd.startsWith("MAIL FROM")) {
            if (behaviour.senderFail) send("553 5.7.1 Sender address rejected");
            else send("250 OK");
          } else if (cmd.startsWith("RCPT TO")) {
            if (behaviour.recipientFail) send("550 5.1.1 Recipient address rejected");
            else send("250 OK");
          } else if (cmd.startsWith("DATA")) {
            send("354 End data with <CR><LF>.<CR><LF>");
          } else if (line === ".") {
            send("250 OK queued");
          } else if (cmd.startsWith("QUIT")) {
            send("221 Bye");
            socket.end();
          } else {
            send("250 OK");
          }
        }
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        received,
        close: () =>
          new Promise<void>((done) => {
            for (const socket of sockets) socket.destroy();
            server.close(() => done());
          }),
      });
    });
  });
}
