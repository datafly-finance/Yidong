import dayjs from "dayjs";
import { filter, interval } from "rxjs";
import { Log } from "../utils/log";

export const Tick = (ticker:number,isDev:boolean = false)=>
    interval(ticker).pipe(
        filter(() => {
            if (isDev) return true;
            const now = dayjs().format("HH:mm:ss");
            if (dayjs().day() < 1 || dayjs().day() > 5) return false;
            if (now >= "09:25:00" && now <= "11:30:00" || now >= "13:00:00" && now <= "15:00:00") {
                return true;
            }
            Log("不在交易时间!")
            return false;
        })
    )