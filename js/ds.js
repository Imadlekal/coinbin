$(document).ready(function() {

	/* DoubleSpend code */

	var txid_url = "https://txid.io/ds/";
	var bitaps_url = "https://bitaps.com/";
	var bitaps_api = "https://api.bitaps.com/btc/v1/blockchain/transaction/";
	var blockcypher_url = "https://live.blockcypher.com/btc/tx/";
	var autobump = 1;

	$('#doubleFee').val('0.001');		// default fee value
	$('#doubleSpendBtn').attr('disabled',true);

	$('#doubleAutoFee').click(function() {
		if (this.checked) {
			$('#doubleFee').attr('disabled',true);
			getAutoFee(226);	// standard transaction size with 1 input and 2 outputs, hardcoded for now
		} else {
			$('#doubleFee').attr('disabled',false);
			$("#doubleAutoFeeStatus").addClass('hidden');
		}
	});
	$('#doubleAutoFee').attr('checked',false);
	$('#doubleAutoFee').click();


	function getAutoFee(txsize) {
		$.ajax ({
			type: "GET",
			url: "https://bitcoinfees.earn.com/api/v1/fees/recommended",
			dataType: "json",
			async: true,
			error: function(data) {
				$("#doubleAutoFeeStatus").removeClass('hidden').removeClass('alert-info').addClass('alert-danger').html('<span class="glyphicon glyphicon-exclamation-sign"></span> Unable to calculate actual fee, please use manual mode!');
				$('#doubleSpendBtn').attr('disabled',true);
			},
			success: function(data) {
				if(data.fastestFee) {
					var fee21co = data.fastestFee*txsize/100000000*2;  //  +100%
					$('#doubleFee').val(fee21co.toFixed(8));
					$("#doubleAutoFeeStatus").addClass('hidden')
					}
			},
			complete: function(data, status) {
				//
			}
		});
	}

	$('#autoBumpFee').click(function() {
		if (this.checked) {
			autobump = 1;
		} else {
			autobump = 0;
		}
	});

	// status messages
	function showSuccessStatus(message) {
		$('#doubleTransactionCreateStatus').removeClass('hidden').removeClass('alert-warning').removeClass('alert-danger').addClass('alert-success').html(message);
	}
	function showWarningStatus(message) {
		$('#doubleTransactionCreateStatus2').removeClass('hidden').removeClass('alert-success').removeClass('alert-danger').addClass('alert-warning').html(message);
	}
	function showErrorStatus(message) {
		$('#doubleTransactionCreateStatus').removeClass('hidden').removeClass('alert-success').removeClass('alert-warning').addClass('alert-danger').html(message);
	}

	// main code
	$('#doublePrivateKey').change(function() {
		$("#doubleAddressFromPrivate").addClass('hidden')
		$('#doubleTransactionCreate').addClass('hidden');

		try {
			var privkey = $('#doublePrivateKey').val();
			var pubkey = coinjs.wif2pubkey(privkey).pubkey;
			$('#doublePrivateKey').attr('data-pubkey',pubkey);
			var a1 = coinjs.wif2address(privkey)['address'];
			var a2 = coinjs.segwitAddress(pubkey)['address'];
			var a3 = coinjs.bech32Address(pubkey)['address'];
			var htmlmsg = '<span class="glyphicon glyphicon-info-sign"></span> Double-spending one of following decoded addresses: <ul><li><a href='+bitaps_url+a1+' target=_blank rel=noreferrer>'+a1+'</a></li><li><a href='+bitaps_url+a2+' target=_blank rel=noreferrer>'+a2+'</a></li><li><a href='+bitaps_url+a3+' target=_blank rel=noreferrer>'+a3+'</a></li></ul>';
			$("#doubleAddressFromPrivate").removeClass('hidden').removeClass('alert-danger').addClass('alert-info').html(htmlmsg);
			$('#doubleSpendBtn').attr('disabled',false);
		} catch (err) {
			if ($('#doublePrivateKey').val() !== '')
				$("#doubleAddressFromPrivate").removeClass('hidden').removeClass('alert-info').addClass('alert-danger').html('<span class="glyphicon glyphicon-exclamation-sign"></span> Can not decode address from Private key!')
				$('#doubleSpendBtn').attr('disabled',true);
		}
		// check tx status again
		if ($('#prevTxid').val() !== '')
			$('#prevTxid').change();
	});



	$('#prevTxid').change(function() {
		$("#checkTXConfirmedStatus").addClass('hidden')
		$("#checkTXConfirmedStatusRBF").addClass('hidden')
		$('#doubleTransactionCreate').addClass('hidden');
                $('#doubleTransactionCreateStatus').addClass('hidden');
                $('#doubleTransactionCreateStatus2').addClass('hidden');

		var txidvalue = $('#prevTxid').val();
		if (txidvalue !== '') {
			isTXConfirmed(txidvalue)
				.then(function(resp) {
					if (resp.isconfirmed == 0) {
						$("#checkTXConfirmedStatus").removeClass('hidden').removeClass('alert-danger').addClass('alert-info').html('<span class="glyphicon glyphicon-info-sign"></span> Transaction still unconfirmed, Double-spending still possible!');
						if (resp.rbf == 0) {
							$("#checkTXConfirmedStatusRBF").removeClass('hidden').html('<span class="glyphicon glyphicon-warning-sign"></span> This is non-replaceable transaction (RBF flag not set). Double-spending will take more time, please be patient!<br>It is recommended to use Replace-By-Fee transactions if possible.');
						}
						$('#doubleSpendBtn').attr('disabled',false);
					} else if (resp.isconfirmed == 1) {
						$("#checkTXConfirmedStatus").removeClass('hidden').removeClass('alert-info').addClass('alert-danger').html('<span class="glyphicon glyphicon-exclamation-sign"></span> Transaction already confirmed! Can not doublespend it!');
						$('#doubleSpendBtn').attr('disabled',true);
					} else {
						$("#checkTXConfirmedStatus").removeClass('hidden').removeClass('alert-info').addClass('alert-danger').html('<span class="glyphicon glyphicon-exclamation-sign"></span> Unable to check transaction status, this does not exist in the Network, invalid, already double-spent or RBF-replaced. Please doublecheck TXID or try again later!');
						$('#doubleSpendBtn').attr('disabled',true);
					}
				})
				.catch(function(error) {
					$('#doubleSpendBtn').attr('disabled',false);
				})
			};
        });

	function isTXConfirmed(txid) {
		var ajax = {
			post : function(url, data) {
				return new Promise(function(resolve, reject) {
					var xhr = new XMLHttpRequest();
					xhr.open('POST', url, true);

					xhr.onload = function() {
						if (xhr.status != 200) 
							return reject(`Response Status: ${xhr.status}\n${xhr.responseText}`);

						resolve(JSON.parse(xhr.responseText));
					}

					xhr.onerror = function() {
						reject('Failed to connect to remote server');
					}
					
					xhr.send(JSON.stringify(data));
				})
			}
		}


		var data = {
			txid : txid
		}

		return ajax
			.post(txid_url+'checktxid.php', {txid : txid})
			
			.then(function(resp) {
				if (resp.status != 'ok') {
					$("#checkTXConfirmedStatus").removeClass('hidden').removeClass('alert-info').addClass('alert-danger').html('<span class="glyphicon glyphicon-exclamation-sign"></span> Unable to check transaction status or wrong TXID. Please double-check input!');
					$('#doubleSpendBtn').attr('disabled',true);
					throw '<b>Server Error:</b> ' + resp.error;
				}
				return resp;
			})
	}



	$("#doubleSpendBtn").click(function() {
		var ajax = {
			post : function(url, data) {
				return new Promise(function(resolve, reject) {
					var xhr = new XMLHttpRequest();
					xhr.open('POST', url, true);

					xhr.onload = function() {
						if (xhr.status != 200) 
							return reject(`Response Status: ${xhr.status}\n${xhr.responseText}`);

						resolve(JSON.parse(xhr.responseText));
					}

					xhr.onerror = function() {
						reject('Failed to connect to remote server');
					}
					
					xhr.send(JSON.stringify(data));
				})
			}
		}



		function createDoubleSpendTx(txid, pubkey, oaddr, fee) {
			var data = {
				prevtxid : txid,
				inpubkey: pubkey,
				outaddr: oaddr,
				newfee : fee,
				autobump : autobump
			}

			return ajax
				.post(txid_url+'createdoubletx.php', {prevtxid : txid, inpubkey : inpubkey, outaddr : oaddr, newfee : fee, autobump : autobump})
				
				.then(function(resp) {
					if (resp.status != 'ok') {
						$("#doubleSpendBtn").attr('value','Request New TX...').removeAttr('disabled');
						throw resp;		// error message here in resp.doublespendtx
					}
					$("#doubleSpendBtn").attr('value','Request New TX...').removeAttr('disabled');
					return resp;
				})
		}


		function signTransaction(script, privateKey) {
			return coinjs.transaction()
				.deserialize(script)
				.sign(privateKey);
		}

		function broadcastTransaction(signedTransaction, checksumid) {
			return ajax.post(txid_url+'broadcastdoubletx.php', {'doublespendsignedtx': signedTransaction, 'id': checksumid});
		}

		$("#double .has-error").removeClass('has-error');
		$('#doubleTransactionCreateStatus').addClass('hidden');
		$('#doubleTransactionCreateStatus2').addClass('hidden');
		$('#doubleTransactionCreate').addClass('hidden');
		$('#doubleBroadcastStatus').addClass('hidden');
		$('#doubleBroadcastStatus2').addClass('hidden');

		var privateKey = $('#doublePrivateKey').val();
		var inpubkey = $('#doublePrivateKey').attr('data-pubkey');
		var txid = $('#prevTxid').val();
		var outaddr = $('#outAddr').val();
		var fee = $('#doubleFee').val();

		if (privateKey == '') $('#doublePrivateKey').parent().addClass('has-error')
		if (txid == '') $('#prevTxid').parent().addClass('has-error');
		if (outaddr == '') $('#outAddr').parent().addClass('has-error');
		if (fee == '') $('#doubleFee').parent().addClass('has-error');

		if($("#double .has-error").length != 0) {
			showErrorStatus('Please complete all input data!');
			return;
		}
		
		$("#doubleSpendBtn").attr('value','Please wait, processing request...').attr('disabled',true);
		createDoubleSpendTx(txid, inpubkey, outaddr, fee)			
			.then(function(data) {
				//  prepare correct signed transaction depending on its type - input data here in JSON
				switch (data.type) {
					case 'legacy':
						var signed = signTransaction(data.doublespendtx, privateKey);
						break;
					case 'segwit':
						var tx = coinjs.transaction();
						var t = tx.deserialize(data.doublespendtx);
						t.ins.remove(0);
						var s = coinjs.script();
						s.writeBytes(Crypto.util.hexToBytes(data.script));
						s.writeOp(0);
						s.writeBytes(coinjs.numToBytes((data.amount*100000000).toFixed(0), 8));
						var script = Crypto.util.bytesToHex(s.buffer);
						t.addinput(data.txid, data.vout, script, data.seq);
						var signed = t.sign(privateKey);
						break;
					case 'bech32':
						var tx = coinjs.transaction();
						var t = tx.deserialize(data.doublespendtx);
						t.ins.remove(0);
						var s = coinjs.script();
						var redeemscript = coinjs.bech32redeemscript(data.address);
						s.writeBytes(Crypto.util.hexToBytes(redeemscript));
						s.writeOp(0);
						s.writeBytes(coinjs.numToBytes((data.amount*100000000).toFixed(0), 8));
						var script = Crypto.util.bytesToHex(s.buffer);
						t.addinput(data.txid, data.vout, script, data.seq);
						var signed = t.sign(privateKey);
						break;
				}
				if (signed == data.doublespendtx) throw('Sign Error!');
				data.signedTransaction = signed;
				return data;
			})

			.then(function(data) {
				var tx = coinjs.transaction();
				try {
					// show spending address
					var addrmsg = 'Single input with <b>'+data.amount+'</b> amount from the address <a href='+bitaps_url+txid+'/'+data.address+
						' target=_blank rel=noreferrer>'+data.address+'</a> has been selected for double-spending,<br>keeping everything else untouched.<br>'+
						'Click on the <a target="_blank" href="'+document.location.origin+''+document.location.pathname+'?verify='+data.signedTransaction+
						'">Verify</a> link (opens in a new window) to double-check destination addresses and amounts from the decoded signed transaction.';
					showSuccessStatus(addrmsg);
					// show warnings if any
					if (data.warnmsg){
						showWarningStatus(data.warnmsg);
					}
					// show signed transaction test
					var decode = tx.deserialize(data.signedTransaction);
					$('#doubleTransactionCreate').removeClass('hidden');
					$('#doubleTransactionCreate textarea').attr('checksumid', data.id);
					$('#doubleTransactionCreate textarea').val(data.signedTransaction);
					$('#doubleTransactionCreate .txSize').html(decode.size());
					// enable broadcast button
					$("#doubleSpendBroadcast").attr('value','Broadcast').attr('disabled',false);
				} catch(e) {
					return false;
				}
			})

			.catch(function(error) {
				error = '<b>Server Error:</b> '+ error.doublespendtx;
				showErrorStatus(error);
			})


		$('#doubleSpendBroadcast')
			.unbind('click')
			
			.click(function() {
				var signedTransaction = $('#doubleTransactionCreate textarea').val();
				var checksumid = $('#doubleTransactionCreate textarea').attr('checksumid');

				$("#doubleSpendBroadcast").attr('value','Please wait, processing request...').attr('disabled',true);
				broadcastTransaction(signedTransaction,checksumid)
					.then(function(resp) {
						if (resp.status != 'ok') {
							$('#doubleBroadcastStatus').removeClass('hidden').removeClass('alert-info').addClass('alert-danger');
							$('#doubleBroadcastStatus p[role="doubleBroadcastResult"]').html('Error: ' + resp.doublespendtxid);
							$('#doubleBroadcastStatus2').addClass('hidden');
							$("#doubleSpendBroadcast").attr('value','Broadcast').attr('disabled',false);
							return;
						}

						var htmltxidresponse = 'txid: '+ resp.doublespendtxid;

						$("#doubleSpendBroadcast").attr('value','Successfully broadcasted').attr('disabled',true);
						$('#doubleBroadcastStatus').removeClass('hidden').removeClass('alert-danger').addClass('alert-info');
						$('#doubleBroadcastStatus p[role="doubleBroadcastResult"]').html(htmltxidresponse);

						htmltxidresponse = 'Successfully broadcasted! Your transaction should will be available on BTC network soon!';
						htmltxidresponse += '<br><br>You may check it here using TXID: <a href='+blockcypher_url+resp.doublespendtxid+' target=_blank rel=noreferrer>';
						htmltxidresponse += resp.doublespendtxid +'</a> (BlockCypher)';
						htmltxidresponse += '<br>or here <a href='+bitaps_url+resp.doublespendtxid+' target=_blank rel=noreferrer>';
						htmltxidresponse += resp.doublespendtxid +'</a> (Bitaps)';
						htmltxidresponse += '<br>or using New Output Address here: <a href='+bitaps_url+outaddr+' target=_blank rel=noreferrer>'+outaddr+'</a>';
						htmltxidresponse += '<br><br>This <b>may be not available immediately</b> at all known Block Explorers until some time or until Confirmed by Network.';
						htmltxidresponse += '<br><b>Please be patient! No need to send the same transaction again!</b>';

						$('#doubleBroadcastStatus2').removeClass('hidden').removeClass('alert-danger').addClass('alert-info');
						$('#doubleBroadcastStatus2 p[role="doubleBroadcastResult2"]').html(htmltxidresponse);
							
// 
					})
			})

	})
})
