import dayjs from "dayjs";

export const Log = ( ...args: any[] ) => console.log(dayjs().format("YYYY-MM-DD HH:mm:ss"), ...args);