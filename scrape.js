const WebSocket = require('ws')
const BitMEXClient = require('bitmex-realtime-api');
const fs = require('fs');

var pairs = {
	BTC:{futures:'bm.XBTZ17', spot:'bm.XBTUSD'},
	DSH:{futures:'bm.DASHZ17', spot:'bf.DSHBTC'},
	ETH:{futures:'bm.ETHZ17', spot:'bf.ETHBTC'},
	ETC:{futures:'bm.ETC7D', spot:'bf.ETCBTC'},
	LTC:{futures:'bm.LTCZ17', spot:'bf.LTCBTC'},
	XMR:{futures:'bm.XMRZ17', spot:'bf.XMRBTC'},
	XRP:{futures:'bm.XRPZ17', spot:'bf.XRPBTC'},
	ZEC:{futures:'bm.ZECZ17', spot:'bf.ZECBTC'},
};

var bm = {
	'XBTUSD':{bid:0, ask:0}, 
	'XBTZ17':{bid:0, ask:0}, 
	'DASHZ17':{bid:0, ask:0}, 
	'ETHZ17':{bid:0, ask:0}, 
	'ETC7D':{bid:0, ask:0},
	'LTCZ17':{bid:0, ask:0},
	'XMRZ17':{bid:0, ask:0},
	'XRPZ17':{bid:0, ask:0},
	'ZECZ17':{bid:0, ask:0}, 
};

var bf = {
	'DSHBTC':{bid:0, ask:0}, 
	'ETHBTC':{bid:0, ask:0}, 
	'ETCBTC':{bid:0, ask:0}, 
	'LTCBTC':{bid:0, ask:0}, 
	'XMRBTC':{bid:0, ask:0},
	'XRPBTC':{bid:0, ask:0}, 
	'ZECBTC':{bid:0, ask:0}
};

var channel_list = {};

function start_bf(){
	
    var ws = new WebSocket('wss://api.bitfinex.com/ws/');
	var shit = false;
	var timeoutObj;
	
	ws.onopen = () => {
		// API keys setup here (See "Authenticated Channels")
		
		// subscribe
		for (var i in bf){
			ws.send(JSON.stringify({
			   "event":"subscribe",
			   "channel":"ticker",
			   "pair":i
			}));
		}
		
	}
	
    ws.on('message', function(msg) {
		obj = JSON.parse(msg);
		if (typeof obj.event !== 'undefined'){
			switch(obj.event) {
				case "info": 
					if (typeof obj.version !== 'undefined'){
						console.log(getDateTime() + ' [Bitfinex] Version: ' + obj.version);
					} else {
						console.log(getDateTime() + ' [Bitfinex] Info: ' + obj.code + ' ' + obj.obj);
					}
					break;
				case "subscribed": 
					channel_list[obj.chanId] = obj.pair;
					break;
				case 'error':
					console.log(getDateTime() + ' [Bitfinex] ERROR: ' + obj.code + ' ' + obj.obj);
					shit = true;
					reconnect_bf();
					break;
			}
		} else if (typeof obj[0] === 'number' && obj.length == 11){
			clearTimeout(timeoutObj);
			// return ticker!
			var pairname = channel_list[obj[0]];
			bf[pairname].bid = obj[1];
			bf[pairname].ask = obj[3];
			//handleNewData();
			timeoutObj = setTimeout(() => {
				console.log(getDateTime() + ' No new data received from Bitfinex for 60 seconds. Resconnecting websocket now.');
				shit = true;
				reconnect_bf();
			}, 60*1000);
		}
	});
	
    ws.onclose = function(){
		shit = true;
		reconnect_bf();
		console.log(getDateTime() + ' Bitfinex socket closed.');
    };
	
	ws.onerror = function(){
		shit = true;
		reconnect_bf();
		console.log(getDateTime() + ' Bitfinex error occured.');
    };
	
	function reconnect_bf(){
		setTimeout(function(){
			if (shit) {
				shit = false;
				console.log(getDateTime() + ' Bitfinex websocket reconnecting.');
				ws.close();
				start_bf();
			}
		}, 10000);
	}
	
}

function start_bm(){
	
	var ws = new WebSocket('wss://www.bitmex.com/realtime');
	var shit = false;
	var timeoutObj;
	
	ws.onopen = () => {
		// API keys setup here 
		
		// subscribe
		tempArr = [];
		for (var i in bm){
			tempArr.push("instrument:" + i);
		}
		ws.send(JSON.stringify({
			"op": "subscribe", 
			"args": tempArr
		}));
	}
	
    ws.on('message', function(msg) {
		obj = JSON.parse(msg);
		if (typeof obj.data !== 'undefined'){
			clearTimeout(timeoutObj);
			if (typeof obj.data[0].bidPrice !== 'undefined'){
				bm[obj.data[0].symbol].bid = obj.data[0].bidPrice;
			}
			if (typeof obj.data[0].askPrice !== 'undefined'){
				bm[obj.data[0].symbol].ask = obj.data[0].askPrice;
			}
			timeoutObj = setTimeout(() => {
				console.log(getDateTime() + ' No new data received from Bitmex for 60 seconds. Resconnecting websocket now.');
				shit = true;
				reconnect_bm();
			}, 60*1000);
		} else {
			console.log(obj);
		}
	});
	
    ws.onclose = function(){
		shit = true;
		reconnect_bm();
		console.log(getDateTime() + ' Bitmex socket closed.');
    };
	
	ws.onerror = function(){
		shit = true;
		reconnect_bm();
		console.log(getDateTime() + ' Bitmex shit occured');
    };
	
	function reconnect_bm(){
		setTimeout(function(){
			if (shit) {
				shit = false;
				console.log(getDateTime() + ' Bitmex websocket reconnecting.');
				ws.close();
				start_bm();
			}
		}, 10000);
	}
	
}

function handleNewData(){
	/*for (var i in pairs){
		console.log(i);
		console.log('Bitfinex: ' + pairs[i].bf.bid + ' ' + pairs[i].bf.ask);
		console.log('Bitmex: ' + pairs[i].bm.bid + ' ' + pairs[i].bm.ask);
	}*/
}

function printAll(){
	//process.stdout.write('\033c');
	for (var i in pairs){
		// time, spot bid, spot ask, futures bid, futures ask
		fs.appendFile('output\\' + i + '.csv', getDateTime() + ',' + eval(pairs[i].spot).bid + ',' + eval(pairs[i].spot).ask + ',' + eval(pairs[i].futures).bid + ',' + eval(pairs[i].futures).ask + '\r\n', (err) => {  
			if (err) console.log(err);
		});
		/*console.log(i);
		console.log('Spot: ' + eval(pairs[i].spot).bid + ' ' + eval(pairs[i].spot).ask);
		console.log('Futures: ' + eval(pairs[i].futures).bid + ' ' + eval(pairs[i].futures).ask);*/
	}
	
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;

}

start_bf();
start_bm();

var timerObj = setInterval(printAll, 10000);

