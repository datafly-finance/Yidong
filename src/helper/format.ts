export const CodeWithType = (code:string) => code.startsWith("6")?`1.${code}`:`0.${code}`;

export const CodeWithHeader = (code:string) => code.startsWith("6")?`sh${code}`:`sz${code}`;