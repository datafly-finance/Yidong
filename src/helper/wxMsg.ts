import { States, YiDongType } from "../eastmoney/yidong";
import { CodeWithType } from "./format";

export const bot1 = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=b89223ed-f0b3-4720-951c-96a734e6685a"

export const SendNewsMsg = ( msg: YiDongType, bot: string = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=3946e1f9-4326-4a9b-9945-887649475ac3" ) =>
{
    const [ time, code, name, state, info1, isGood ] = msg;
    const type = States.GetStatus( state )
    const msgText = {
        "msgtype": "news",
        "news": {
            "articles": [
                {
                    "title": `${ name } ${ time }  [${ isGood === '1' ? "Good" : "Bad" }]`,
                    "description": `${ type } ${ info1 }`,
                    "url": `https://wap.eastmoney.com/quote/stock/${ CodeWithType( code ) }.html`,
                    "picurl": `http://webquotepic.eastmoney.com/GetPic.aspx?nid=${ CodeWithType( code ) }&imageType=r&_t=${ Date.now() }`
                }
            ]
        }
    }
    // axios.post( bot, msgText,
    //     {
    //         headers: {
    //             "Content-Type": "application/json"
    //         }
    //     })
    fetch( bot, {
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify( msgText ),
        method: "POST"
    } )
}