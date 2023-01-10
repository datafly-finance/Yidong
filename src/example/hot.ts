import { States, YiDongData, YiDongType, YiDongWithFilter } from "../eastmoney/yidong";
import { bot1, SendNewsMsg } from "../helper/wxMsg";
import { hotStockQuery } from "../tonghuashun/hot";
import { Log } from "../utils/log";

//  10分钟 更新
const isHotStock = hotStockQuery( !!process.env.DEV )( 10 )

const FilterState = (it:States.State) => {
     const status = States.State;
     if([status.加速下跌,status.火箭发射,status.高台跳水,status.向上缺口,status.快速反弹,status.向下缺口].includes(it)){
         return true;
     }
     return false;
}

const HotNew = () => YiDongWithFilter( [
    it => isHotStock(it[1]),
    it => FilterState(it[3]),
] )( YiDongData( !!process.env.DEV )( 5 )( [] ) );

HotNew().subscribe( news => SendNewsMsg(news,bot1) );