import { yidongData,codes } from '../eastmoney/yidong'
import { SendNewsMsg } from '../helper/wxMsg'

yidongData(codes).subscribe(SendNewsMsg)