import dayjs from 'dayjs';
import { filter } from 'rxjs';
import { Log } from '../utils/log';
import { TickHub, isBig, isUp, isDown, zhenfu } from '../eastmoney/tick';
import { bufferCount } from 'rxjs';
import { SendTextMsg } from '../helper/wxMsg';

const { QueryStockTick, DelStockTick, HasStockTick, AddStockTick } = TickHub()

export const codes = [
    "688670", // 金迪克
    "000815", // 美利云
    "002469", // 三维化学
    "300505"  // 川金诺
]

const codeName = ( code: string ) =>
{
    switch ( code )
    {
        case "688670": return "金迪克"
        case "000815": return "美利云"
        case "002469": return "三维化学"
        case "300505": return "川金诺"
        default: return "未知"
    }
}

AddStockTick( codes )

const isWorkingTime = ()=>{
    if (!!process.env.DEV) return true;
    const now = dayjs().format( "HH:mm:ss" );
    if ( dayjs().day() < 1 || dayjs().day() > 5 ) return false;
    if ( now >= "09:15:00" && now <= "11:30:00" || now >= "13:00:00" && now <= "15:00:00" )
    {
        return true;
    }
    return false;
}

const SendText = (msg:string)=>{
    if (isWorkingTime()){
        SendTextMsg(msg)
    }else{
        Log("不在交易时间，不发送消息",msg)
    }
}


codes.map( code => ( {
    code,
    data$: QueryStockTick( code )
} ) ).map( it =>
{
    const { code, data$ } = it;
    data$?.pipe(
        bufferCount( 7, 1 ),
    ).subscribe( its =>
    {
        const last = its[ its.length - 1 ]
        const rate = zhenfu( its )
        if ( isUp( its ) )
        {
            Log(  codeName(code), last[ 0 ], "大幅上涨", rate( it => it )?.toFixed( 2 ) )
            SendText(`${last[ 0 ]}【${codeName(code)}】大幅上涨 ${rate( it => it )?.toFixed( 2 )}%`)
        }
        if ( isDown( its ) )
        {
            Log(  codeName(code), last[ 0 ], "大幅下跌", rate( it => it )?.toFixed( 2 ) )
            SendText(`${last[ 0 ]}【${codeName(code)}】大幅下跌 ${rate( it => it )?.toFixed( 2 )}%`)
        }
    } )
    data$?.subscribe( it =>
        {
            if ( isBig( it ) )
            {
                Log( codeName(code), it[ 0 ], "出现大单", it[ 1 ], it[ 2 ], it[ 4 ] == "1" ? "卖" : it[ 4 ] === "2" ? "买" : "竞价" )
                SendText(`${it[ 0 ]}【${codeName(code)}】出现大单 ${it[ 1 ]} ${it[ 2 ]} ${it[ 4 ] == "1" ? "卖" : it[ 4 ] === "2" ? "买" : "竞价"}`)
            }
        } )
} )
