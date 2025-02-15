export class DenoCommand {
  async executeWithStdin(
    command: string,
    {
      args,
      stdinContent,
    }: {
      args: string[];
      stdinContent: string;
    },
  ) {
    console.log("=============== execute with args", command, args);
    const denoCommand = new Deno.Command(command, {
      args: args,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = denoCommand.spawn();
    const writer = child.stdin.getWriter();
    writer.write(new TextEncoder().encode(stdinContent));
    writer.releaseLock();
    child.stdin.close();

    let stdout = "";
    let stderr = "";
    const stdoutPiping = child.stdout.pipeTo(
      new WritableStream({
        write: (chunk) => {
          stdout += new TextDecoder().decode(chunk);
        },
      }),
    );
    const stderrPiping = child.stderr.pipeTo(
      new WritableStream({
        write: (chunk) => {
          stderr += new TextDecoder().decode(chunk);
        },
      }),
    );

    const code = await child.status;
    await stderrPiping;
    await stdoutPiping;

    return {
      code,
      stdout,
      stderr,
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
