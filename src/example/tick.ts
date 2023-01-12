import dayjs from 'dayjs';
import { Log } from '../utils/log';
import { TickHub, isBig, zhenfu, isUpDownConfig } from '../eastmoney/tick';
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

const isWorkingTime = () =>
{
    if ( !!process.env.DEV ) return true;
    const now = dayjs().format( "HH:mm:ss" );
    if ( dayjs().day() < 1 || dayjs().day() > 5 ) return false;
    if ( now >= "09:15:00" && now <= "11:30:00" || now >= "13:00:00" && now <= "15:00:00" )
    {
        return true;
    }
    Log( "不在交易时间范围内!" )
    return false;
}

const isInTime = ( time: string ) =>
{
    if ( !!process.env.DEV ) return true;
    const start = dayjs().subtract( 2, 's' ).format( "HH:mm:ss" );
    const now = dayjs().format( "HH:mm:ss" );
    if ( now >= time && start <= time )
    {
        return true;
    }
    Log( "不在指定时间范围内!" )
    return false;

}

const SendText = ( time: string, msg: string ) =>
{
    if ( isWorkingTime() && isInTime( time ) )
    {
        SendTextMsg( msg )
    }
}

const formatMoney = ( price: string, count: string ) =>
{
    return ( parseFloat( price ) * parseInt( count ) / 100 ).toFixed( 2 ) + "万"
}

codes.map( code => ( {
    code,
    data$: QueryStockTick( code )
} ) ).map( it =>
{
    const { code, data$ } = it;
    const UpDown = ( count: number ) => ( fn: {
        up: ( rate: number ) => boolean
        down: ( rate: number ) => boolean
    } ) =>
    {
        data$?.pipe(
            bufferCount( count, 1 ),
        ).subscribe( its =>
        {
            const last = its[ its.length - 1 ]
            const rate = zhenfu( count )( its )
            const minute = count * 3 / 60
            const isUpDown = isUpDownConfig( count )
            if ( isUpDown( fn.up )( its ) )
            {
                Log( codeName( code ), `${ last[ 0 ] }【${ codeName( code ) }】在${ minute }分钟内上涨:${ rate( it => it )?.toFixed( 2 ) }%` )
                SendText( last[ 0 ], `${ last[ 0 ] }【${ codeName( code ) }】在${ minute }分钟内上涨:${ rate( it => it )?.toFixed( 2 ) }%` )
            }
            if ( isUpDown( fn.down )( its ) )
            {
                Log( codeName( code ), `${ last[ 0 ] }【${ codeName( code ) }】在${ minute }分钟内下跌:${ rate( it => it )?.toFixed( 2 ) }%` )
                SendText( last[ 0 ], `${ last[ 0 ] }【${ codeName( code ) }】在${ minute }分钟内下跌:${ rate( it => it )?.toFixed( 2 ) }%` )
            }
        } )
    }
    const MinuteCount = 20
    UpDown( MinuteCount * 0.5 )( {
        up: rate => rate > 0.5,
        down: rate => rate < -0.5
    } )
    UpDown( MinuteCount * 3 )( {
        up: rate => rate > 1,
        down: rate => rate < -1
    } )

    data$?.subscribe( it =>
    {
        if ( isBig( it ) && it[4] !== "4" )
        {
            Log( codeName( code ), `${ it[ 0 ] }【${ codeName( code ) }】出现${ it[ 4 ] == "1" ? "卖" :"买" }单 ${ formatMoney( it[ 1 ], it[ 2 ] ) }, 价格:${ it[ 1 ] } ` )
            SendText( it[ 0 ], `${ it[ 0 ] }【${ codeName( code ) }】出现${ it[ 4 ] == "1" ? "卖" : "买" }单 ${ formatMoney( it[ 1 ], it[ 2 ] ) }, 价格:${ it[ 1 ] } ${ it[ 4 ] == "1" ? "卖" : "买" }` )
        }
    } )
} )