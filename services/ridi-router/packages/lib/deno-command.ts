export class DenoCommand {
  async executeWithStdin(
    command: string,
    { args, stdinContent }: {
      args: string[];
      stdinContent: string;
    },
  ) {
    const denoCommand = new Deno.Command(command, {
      args: args,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = denoCommand.spawn();
    const writer = child.stdin.getWriter();
    writer
      .write(new TextEncoder().encode(stdinContent));
    writer.releaseLock();
    child.stdin.close();
    const { code, stdout, stderr } = await child.output();

    return {
      code,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    };
  }
  async execute(command: string, args: string[]) {
    const cmd = new Deno.Command(command, { args });
    const { code, stdout, stderr } = await cmd.output();

    return {
      code,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    };
  }
}
