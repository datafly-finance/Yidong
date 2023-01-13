import { distinct, filter, from, Subject, switchMap } from "rxjs"
import { Tick } from "../helper/tick"
import { Get } from "../utils/fetcher"

export namespace States
{
    export enum State
    {
        有大买盘 = "1",
        大笔买入 = "2",

        有大卖盘 = "101",
        大笔卖出 = "102",

        封涨停板 = "201",
        打开涨停板 = "202",

        封跌停板 = "301",
        打开跌停板 = "302",

        创60日新低 = "304",
        向上缺口 = "401",

        火箭发射 = "402",
        快速反弹 = "403",
        向下缺口 = "501",
        高台跳水 = "502",
        加速下跌 = "503",
    }

    export const states = new Map<string, string>()
    states.set( "1", "有大买盘", )
    states.set( "2", "大笔买入" )
    states.set( "101", "有大卖盘", )
    states.set( "102", "大笔卖出" )
    states.set( "201", "封涨停板" )
    states.set( "202", "打开涨停板" )
    states.set( "301", "封跌停板" )
    states.set( "304", "60日新低" )
    states.set( "401", "向上缺口" )
    states.set( "402", "火箭发射" )
    states.set( "403", "快速反弹" )
    states.set( "501", "向下缺口" )
    states.set( "502", "高台跳水" )
    states.set( "503", "加速下跌" )

    export const GetStatus = ( state: State ) => states.get( state ) ?? "未知"
}

declare module OutPut
{

    export interface Data
    {
        pkyd: string[];
    }

    export interface RootObject
    {
        rc: number;
        rt: number;
        svr: number;
        lt: number;
        full: number;
        dlmkts: string;
        data: Data;
    }

}

type Time = string
type Code = string
type Name = string
type State = States.State
type Info = string
type IsGood = string

export type YiDongType = [
    Time,
    Code,
    Name,
    State,
    Info,
    IsGood
]

const url = ( codes: string[] ) => `http://push2.eastmoney.com/api/qt/pkyd/get?&fields=f1,f2,f4,f5,f6,f7&secids=${ codes.join( "," ) }&lmt=100&ut=fa5fd1943c7b386f172d6893dbfba10b`

export const YiDongFetcher = ( codes: string[] ) => Get<OutPut.RootObject>( url( codes ) ).then( it => it.data.pkyd.map( it => it.split( "," ) as YiDongType ) )


export const codes = [
    "1.688670", // 金迪克
    "0.000815", // 美利云
    "0.002469", // 三维化学
    "0.300505"  // 川金诺
]

type FilterFn = ( it: YiDongType ) => boolean;

export const YiDongData = ( isDev: boolean = false ) => ( second: number ) => ( codes: string[] ) =>
{
    const keyFn = ( it: YiDongType ) => `${ it[ 0 ] }-${ it[ 1 ] }-${ it[ 3 ] }`
    return Tick( second * 1000, isDev ).pipe(
        switchMap( ()=> YiDongFetcher( codes ) ),
        switchMap( it => from( it ) ),
        distinct( keyFn ),
    )
}

export const YiDongWithFilter = ( filters: FilterFn[] ) => ( subject: Subject<YiDongType> ) =>
    subject.pipe(
        filter( it => filters.every( fn => fn( it ) ) )
    )

export const yidongData = YiDongData( !!process.env.DEV )( 5 );