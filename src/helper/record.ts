import { Observable } from "rxjs";

export const record = <T> ( keyFn: ( input: T ) => string ) => ( clear$: Observable<any> ) =>
{
    const map = new Map<string, T>();
    clear$.subscribe( () => map.clear() );

    return {
        has: ( key:string ) => map.has( key ),
        record: ( it: T ) =>
        {
            const key = keyFn( it );
            map.set( key, it );
        }
    }
}