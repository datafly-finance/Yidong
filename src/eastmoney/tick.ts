import dayjs from 'dayjs';
import { interval, Subject } from 'rxjs';
import { EventSourceBuilder } from './../utils/eventSource';
import { CodeWithType } from './../helper/format';


const url = ( code: string ) => `https://45.push2delay.eastmoney.com/api/qt/stock/details/sse?fields1=f1,f2,f3,f4&fields2=f51,f52,f53,f54,f55&mpi=1000&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&pos=-5000&secid=${ CodeWithType( code ) }&wbp2u=|0|0|0|web`

declare module OutPut
{

    export interface Data
    {
        code: string;
        market: number;
        decimal: number;
        prePrice: number;
        details: string[];
    }

    export interface RootObject
    {
        rc: number;
        rt: number;
        svr: number;
        lt: number;
        full: number;
        dlmkts: string;
        data: Data | null;
    }

}

type Time = string;
type Price = string;
type Shou = string;
type Count = string;
type State = string;
type StockTick = [ Time, Price, Shou, Count, State ]

const parseTick = ( tick: string ) =>
{
    const tickTemp = tick.split( "," )
    if ( tickTemp.length != 5 ) return null;
    return tickTemp as StockTick
}

export const TickData = ( code: string ) => EventSourceBuilder( url( code ) )(
    ( input: OutPut.RootObject ) => input.data?.details.map( parseTick )
)

export const Tick = ( code: string ) =>
{
    const response = new Subject<StockTick>();
    let last = ""
    interval( 5 * 60 * 1000 ).subscribe( () =>
    {
        const now = dayjs().format( "HH:mm:ss" );
        if ( now > "09:00:00" || now < "09:15:00" )
        {
            last = ''
        }
    } )
    TickData( code ).subscribe( tick =>
    {
        if ( tick )
        {
            tick.forEach( it =>
            {
                if ( it )
                {
                    if ( it[ 0 ] < last ) return;
                    last = it[ 0 ]
                    response.next( it )
                }
            } )
        }
    } )
    return response
}

export const TickHub = () =>
{
    const m = new Map<string, Subject<StockTick>>()
    return {
        AddStockTick: ( codes: string[] ) =>
        {
            codes.forEach( code =>
            {
                const subject = m.get( code )
                if ( !subject )
                {
                    m.set( code, Tick( code ) )
                }
            } )
        },
        QueryStockTick: ( code: string ) => m.get( code ),
        DelStockTick: ( code: string ) =>
        {
            const s = m.get( code );
            if ( s ) s.unsubscribe()
            m.delete( code )
        },
        HasStockTick: ( code: string ) => !!m.get( code )
    }
}

// 是否是大单
export const isBig = ( tick: StockTick ) => ( parseFloat( tick[ 1 ] ) * parseInt( tick[ 2 ] ) ) > 10000
// 振幅
export const zhenfu = ( count: number ) => ( ticks: StockTick[] ) => <Out> ( fn: ( rate: number ) => Out ) =>
{
    if ( ticks.length < count ) return null;
    const temp = ticks.slice( -count )
    const price = temp.map( it => Number( it[ 1 ] ) )

    const last = price[ price.length - 1 ]
    const min = Math.min( ...price );
    const max = Math.max( ...price );

    let value: number;
    if ( last === min )
    {
        value = max
    }
    if ( last === max )
    {
        value = min
    }
    if ( value! )
    {
        const rate = ( ( last - value ) / value ) * 100;
        return fn( rate )
    } else
    {
        const rate = ( ( max - min ) / min ) * 100
        return fn( rate )
    }
}
export const realZhenfu = ( count: number ) => ( ticks: StockTick[] ) => ( fn: ( rate: number ) => boolean ) =>
{
    if ( ticks.length < count ) return false;
    const temp = ticks.slice( -count )
    const price = temp.map( it => Number( it[ 1 ] ) )

    const last = price[ price.length - 1 ]
    const min = Math.min( ...price );
    const max = Math.max( ...price )
    if ( last === min )
    {
        const rate = ( ( last - max ) / max ) * 100;
        return fn( rate )
    }
    if ( last === max )
    {
        const rate = ( ( last - min ) / max ) * 100;
        return fn( rate )
    }
    return false;
}
// 是否剧震
export const isUp = ( ticks: StockTick[] ) => realZhenfu( 20 )( ticks )( rate => rate > 0.5 )
export const isDown = ( ticks: StockTick[] ) => realZhenfu( 20 )( ticks )( rate => rate < -0.5 )

export const isUpDownConfig = ( count: number ) => ( fn: ( rate: number ) => boolean ) => ( ticks: StockTick[] ) => realZhenfu( count )( ticks )( fn ) 