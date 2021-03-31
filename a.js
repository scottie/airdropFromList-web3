const Web3 = require("web3");
const dotenv = require("dotenv");
var forEach = require('async-foreach').forEach;
var fs = require('fs');

dotenv.config();
const {JSONFromURL} = require("googlesheetstojson");
const CTC = require("./ctc-token.json");
const xDAI = "https://rpc.xdaichain.com/";
var wallet = process.env.KEY;
var spreadSheet = "https://docs.google.com/spreadsheets/d/1Fm2WXyQt0_9SdJOIFRPsnIrQomHEmnmRUG-I2n_8kvo/edit?usp=sharing";
var rowName = "all addresses who performed both";
const CTCaddress = "0xdbcadE285846131a5e7384685EADDBDFD9625557";
const gas = 150000;
var amount =  0.0001;// in tokens not wei (not to power of 18)
var web3 = new Web3(xDAI); 
var account = web3.eth.accounts.wallet.add('0x' + wallet);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

/*
Network Name: xDai
New RPC URL: https://rpc.xdaichain.com/
Chain ID: 0x64 (100)
Symbol: xDai
Block Explorer URL: https://blockscout.com/poa/xdai
*/

const getGoogleSheetURL = async (url) => {
	data = await JSONFromURL(url);
	//console.log(data);
    return data;
}

const checkWalletAmount = async (address, instance) => {
    //console.log("Instance Methods: ", instance.methods);
    var bal = await instance.methods.balanceOf(address).call();
    //console.log("[Balance: " + address + "]", bal);
    return bal;    
}

const writeFile = async (file, array) => {
    console.log(array);
    try{
        var file = fs.createWriteStream(file, {flag: 'wx'});
        file.on('error', function(err) { 
            console.log("ERROR: ", err.message); 
        });
        array.forEach(function(v) { file.write(v + '\n'); });
        file.end();
    }catch(x){
        console.log("ERROR: ", x.message); 
    }
}

const sendCoin = async (address, amount, instance) => {
    var yourbal = await checkWalletAmount(address, instance);
    if(yourbal >= amount){
        const tx = await instance.methods.transfer(address, amount).send({from: web3.eth.defaultAccount, gas:gas});
        return tx;
    }else{
        console.log("[Error] Out of coin !");
        return false;
    }    
}

const main = async (url) => {
    var timestamp = + new Date();
    var gasused = 0;
    console.log("[RUN STAMP]:", timestamp);
    console.log("[YOUR ADDRESS]: ", web3.eth.defaultAccount);
    console.log("[SEND AMOUNT TOKEN]: ", amount);
    amount = web3.utils.toWei(amount.toString());
    
    console.log("[SEND AMOUNT WEI]: ",  amount);
    
    var ok = [];
    var bad = [];
    var startCount = 0;

    const CTCinstance = await new web3.eth.Contract(CTC.abi, CTCaddress);
    await CTCinstance.setProvider(new Web3.providers.HttpProvider(xDAI));
    
    const sheetData = await getGoogleSheetURL(url);
    
    //var startCount = sheetData.length;
    //console.log("CTC.abi", CTC.abi);

    forEach(sheetData, async function(row, index, arr) {
        var done = this.async();
        //var bal = await checkWalletAmount(web3.eth.defaultAccount, CTCinstance);
        //console.log("bal", bal);
        //console.log("amount", amount);
        //if(bal >= amount){
        //   console.log("[YOUR BALANCE WEI]: ", bal);
        //   console.log("[YOUR BALANCE TOKEN]: ",  web3.utils.fromWei(bal.toString()));
       // }else{
        //    console.log("[Error] Out of coin !");
        //} 
        var address = row[rowName];
        if(address){
            try{
                startCount++;
                console.log("[Address]:", address);
                var tx = await sendCoin(address, amount, CTCinstance);
                //console.log("[TX]:", tx);

                if(tx){
                    if(tx.transactionHash){
                        console.log("[TX]:", tx.transactionHash);
                        console.log("[gasUsed:]:", tx.gasUsed);
                        gasused = gasused + tx.gasUsed;
                        ok.push(address +"|"+tx.transactionHash);
                    }else{
                        bad.push(address);
                    }
                    
                }else{
                    bad.push(address);
                }
            }catch(x){
                console.log("[ERROR]:", x.message);
                bad.push(address);
            }
        }
        
        console.log("[ADDRESS DONE]: ", startCount);
        console.log("[OK]: ", ok.length);
        console.log("[BAD]: ", bad.length);
        await writeFile(timestamp.toString() + "-good.txt", ok);
        await writeFile(timestamp.toString() + "-bad.txt", bad);
         setTimeout(function() {
            done();
        }, 5000);

      }, function(done) {
            console.log(done);
            console.log("[ADDRESS ADDRESS]:", startCount);
            console.log("[EST. GAS PRICE]:", (gas * startCount) / 18);
            console.log("[EST. USD PRICE]: $", startCount * 0.13);
            console.log("[REAL GAS USED]:", gasused);
            console.log("[OK]: ", ok.length);
            console.log("[BAD]: ", bad.length);
      });
}

main(spreadSheet);