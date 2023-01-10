import dayjs from "dayjs";
import { interval, filter } from "rxjs";

export const clear$ = interval( 3 * 60 * 60 * 1000 ).pipe(
    filter( () =>
    {
        const now = dayjs().format( "HH:mm:ss" );
        if ( now > "16:00:00" ) return true;
        return false;
    } )
)