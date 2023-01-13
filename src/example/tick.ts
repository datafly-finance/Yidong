import { SendMDMsg } from './../helper/wxMsg';
import dayjs from 'dayjs';
import { bufferCount } from 'rxjs';
import { curry } from 'ramda'

import { Log } from '../utils/log';
import { DaDanMsg, YiDongMsg } from './../helper/msg';
import { SendTextMsg } from '../helper/wxMsg';

import { TickHub, isBig, zhenfu, isUpDownConfig } from '../eastmoney/tick';

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

const bot = (code:string) => 
{
    switch ( code )
    {
        case "688670": return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=35438598-ac58-4bcf-ae47-a5fd34cd4d5c`
        case "000815": return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=917ed147-7a6d-47f4-9965-247ba7f3b09e`
        case "002469": return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=19bcb89b-7c99-44c0-9e72-345feee62aad`
        case "300505": return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=d0bba26e-b954-42a8-8d2b-8c503d21fcee`
        default: return undefined
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

const SendWrap = ( sender: ( msg: string, bot?: string ) => void ) => ( time: string, msg: string,bot?:string ) =>
{
    if ( isWorkingTime() && isInTime( time ) )
    {
        sender( msg,bot )
    }
}

const SendText = SendWrap( SendTextMsg )
const SendMD = SendWrap( SendMDMsg )

const formatMoney = ( price: string, count: string ) =>
{
    return ( parseFloat( price ) * parseInt( count ) / 100 ).toFixed( 2 ) + "万"
}

const tick$ = codes.map( code => ( {
    code,
    data$: QueryStockTick( code )
} ) )


// 异动与大单
tick$.map( it =>
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

            const time = last[ 0 ];
            const rateStr = rate( it => it )?.toFixed( 2 ) ?? '';
            const minuteStr = minute === 0.5 ? "半" : minute.toString();
            const price = last[ 1 ];
            const YiDongMsgCurryFac = curry( YiDongMsg )
            const YiDongMsgCurry = YiDongMsgCurryFac( time )( codeName( code ) )( rateStr )( minuteStr )( price )
            if ( isUpDown( fn.up )( its ) )
            {
                Log( YiDongMsgCurry( 'up' ) )
                SendText( time, YiDongMsgCurry( 'up' ) )
            }
            if ( isUpDown( fn.down )( its ) )
            {
                Log( YiDongMsgCurry( 'down' ) )
                SendText( time, YiDongMsgCurry( 'down' ) )
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
        if ( isBig( it ) && it[ 4 ] !== "4" )
        {
            const time = it[ 0 ];
            const price = it[ 1 ]
            const money = formatMoney( it[ 1 ], it[ 2 ] );
            const direction = it[ 4 ] === "2" ? 'up' : 'down';

            const msg = DaDanMsg( time, codeName( code ), money, price, direction );

            Log( msg )
            SendText( time, msg )
        }
    } )
} )

// 信息汇总
/** 
 * 1. 时间周期 5分钟
 * 2. 指标： 
 *    1. 买入/卖出手数
 *    2. 买入/卖出金额
 *    3. 买入/卖出笔数
 *    4. 买入/卖出 平均 手/笔
 */
tick$.map( it =>
{
    const { code, data$ } = it;
    const MinuteCount = 20
    data$?.pipe(
        bufferCount( MinuteCount * 5 ),
    ).subscribe( its =>
    {
        const last = its[ its.length - 1 ]
        const first = its[0]
        const time = `${first[0]} - ${last[ 0 ]}`;
        const rate = Number(last[1]) - Number(first[1])
        const percent = (rate / Number(first[1]) * 100)
        const upCount = its.filter( it => it[ 4 ] === "2" ).reduce( ( p, v ) => p + Number( v[ 2 ] ), 0 );
        const downCount = its.filter( it => it[ 4 ] === "1" ).reduce( ( p, v ) => p + Number( v[ 2 ] ), 0 );
        const upBiShu = its.filter( it => it[ 4 ] === "2" ).reduce( ( p, v ) => p + Number( v[ 3 ] ), 0 );
        const downBiShu = its.filter( it => it[ 4 ] === "1" ).reduce( ( p, v ) => p + Number( v[ 3 ] ), 0 );
        const upMoney = its.filter( it => it[ 4 ] === "2" ).reduce( ( acc, cur ) => acc + parseFloat( cur[ 1 ] ) * parseInt( cur[ 2 ] ) / 100, 0 );
        const downMoney = its.filter( it => it[ 4 ] === "1" ).reduce( ( acc, cur ) => acc + parseFloat( cur[ 1 ] ) * parseInt( cur[ 2 ] ) / 100, 0 );
        const upAvg = ( upMoney / upBiShu ).toFixed( 2 );
        const downAvg = ( downMoney / downBiShu ).toFixed( 2 );
        const msg =
            `
时间：${ time }  代码：${ codeName( code ) }
> 买入：${ upCount }手 ${ upBiShu }笔 ${ upAvg }万/笔 买入金额：${ upMoney.toFixed( 2 ) }万
> 卖出：${ downCount }手 ${ downBiShu }笔 ${ downAvg }万/笔 卖出金额：${ downMoney.toFixed( 2 ) }万
> 股价波动：${rate.toFixed(2)}(${percent.toFixed(2)}%) 买入/卖出：${ ( upMoney / downMoney ).toFixed( 2 ) }
`
        SendMD( last [0], msg, bot(code) )
        Log( msg )
    } )
} )

