import axios from 'axios';

export const Get = <OutPut>(url:string) => fetch(url).then(res=>res.json() as OutPut)