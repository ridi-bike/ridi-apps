export class DenoCommand {
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
