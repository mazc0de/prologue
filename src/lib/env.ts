const ASSIGNMENT = /^(\s*(?:export\s+)?[A-Za-z_][\w.-]*\s*=\s*)(.*)$/

/** Hides every value in KEY=value lines; comments and blank lines stay as they are. */
export function maskEnv(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      const match = line.trimStart().startsWith('#') ? null : ASSIGNMENT.exec(line)
      return match && match[2] ? match[1] + '•'.repeat(Math.min(match[2].length, 12)) : line
    })
    .join('\n')
}
