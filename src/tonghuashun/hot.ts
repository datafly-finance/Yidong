import { clear$ } from '../helper/clear';
import { record } from '../helper/record';
import { Tick } from '../helper/tick';
import { Get } from '../utils/fetcher'

declare module Input
{

    export interface LiveTag
    {
        anchor: string;
        jump_url: string;
    }

    export interface Tag
    {
        concept_tag: string[];
        popularity_tag: string;
        live_tag: LiveTag;
    }

    export interface StockList
    {
        order: number;
        code: string;
        name: string;
        rate: string;
        analyse: string;
        market: number;
        hot_rank_chg: number;
        analyse_title: string;
        tag: Tag;
    }

    export interface Data
    {
        stock_list: StockList[];
    }

    export interface RootObject
    {
        status_code: number;
        status_msg: string;
        data: Data;
    }

}

const url = `https://eq.10jqka.com.cn/open/api/hot_list/v1/hot_stock/a/hour/data.txt`

export const hotStock = () => Get<Input.RootObject>( url ).then( it => it.data.stock_list )

export const hotStockQuery = ( isDev: boolean = false ) => ( minute: number ) =>
{
    const isRecord = record<Input.StockList>( it => it.code )( clear$ )
    const keyFn = ( it: Input.StockList ) => it.code
    const addHotStock = () =>
    {
        hotStock().then( data =>
        {
            data.forEach( it =>
            {
                if ( !isRecord.has( keyFn( it ) ) )
                {
                    isRecord.record( it )
                }
            } )
        } )
    }
    // Init
    addHotStock()
    // Subscribe
    Tick( minute * 60 * 1000, isDev ).subscribe( addHotStock )

    return ( code: string ) => isRecord.has( code )
}