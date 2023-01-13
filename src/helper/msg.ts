export const YiDongMsg = (
    time:string,
    name:string,
    rate:string,
    minute:string,
    price:string,
    state:'up' | 'down'
)=> `${ time }【${ name }】${minute}分钟内${state === "up"?"上涨":"下跌"}  :${ rate }% , 当前价格:${price}`

export const DaDanMsg = (
    time:string,
    name:string,
    money:string,
    price:string,
    state:'up' | 'down',
)=>`${time} [${name}] ${state === "up" ? '买入' : '卖出'} ${money} , 当前价格:${price}`