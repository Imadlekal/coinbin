$(document).ready(function() {

	var $$ = function(sel, el) {
		return Array.prototype.slice.call((el || document).querySelectorAll(sel));
	}


	function bin2hex(s) {
		return s.split('').reduce(function(res, c) {
			var h = '0' + c.charCodeAt(0).toString(16);
			return res + h.slice(-2);
		}, '');
	}


	function hex2bin(hexString) {
		return hexString.split('')
			.reduce(function(res, x, i, arr) {
				if (i % 2 == 0) return res;
				x = '0x' + arr[i-1] + x;
				return res + String.fromCharCode(parseInt(x));
			}, '');
	}


	var tmp = document.createElement('tmp');
	
	tmp.innerHTML = `
		<p class="checkbox" style="display: none">
			<label>
				<input type="checkbox">
				Encode Address to HEX
			</label>
		</p>
	`;


	var newBlock = tmp.firstElementChild;
	var newCheckbox = $$('input[type=checkbox]', newBlock)[0];


	// Allow data to be sent...
	$$('#opReturn')[0].addEventListener('change', function(e) {
		if (e.target.checked) {
			newBlock.style.display = '';
		}
		else {
			newBlock.style.display = 'none';
			if (newCheckbox.checked) newCheckbox.click();
		}
	})


	// Encode Address to HEX
	newCheckbox.addEventListener('change', function(e) {
		var recipient = $$('div#recipients')[0].firstElementChild;
		var address = $$('input.address', recipient)[0];
		var amount = $$('input.amount', recipient)[0];

		if (e.target.checked) {
			address.value = bin2hex(address.value);
			amount.value = '0';
		}
		else {
			address.value = hex2bin(address.value);
		}
	});


	var recipients = $$('div#recipients')[0];
	recipients.parentNode.insertBefore(newBlock, recipients);

});