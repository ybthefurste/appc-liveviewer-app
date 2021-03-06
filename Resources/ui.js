var CFG = require('CFG');
var xhr = require('xhr');

var Barcode = CFG.OS_WINDOWS ? null : require('ti.barcode');

exports.createDialog = function createDialog() {
	var settings = Ti.App.Properties.getObject('proxy::settings', {
		alloy: false,
		url: 'https://gist.github.com/FokkeZB/71bf38d2371c27132960'
	});

	var win = Ti.UI.createWindow({
		backgroundColor: '#CD1625'
	});

	var samplesBtn = Ti.UI.createButton({
		top: 40,
		left: 20,
		width: 100,
		height: 40,
		title: 'SAMPLES',
		backgroundColor: '#aa1617',
		color: 'white'
	});

	samplesBtn.addEventListener('click', function onClick() {
		var samples = getSamples();

		var samplesWin = Ti.UI.createWindow({
			top: CFG.OS_IOS ? 20 : 0,

			// FIXME: https://jira.appcelerator.org/browse/TIMOB-19142
			backgroundColor: CFG.OS_IOS ? 'white' : 'black'
		});
		var table = Ti.UI.createTableView({
			data: samples.map(function (sample) {
				return {
					title: sample.label,
					color: CFG.OS_IOS ? 'black' : 'white'
				};
			}),
			rowHeight: 40
		});
		table.addEventListener('click', function (e) {
			urlField.value = samples[e.index].url;
			alloySwitch.value = !!samples[e.index].alloy;

			samplesWin.close();
		});
		samplesWin.add(table);
		samplesWin.open();
	});

	var scanBtn = Ti.UI.createButton({
		top: 40,
		right: 20,
		width: 100,
		height: 40,
		title: 'SCAN QR',
		backgroundColor: '#aa1617',
		color: 'white'
	});

	scanBtn.addEventListener('click', function onClick() {
		Barcode.capture({
			acceptedFormats: [Barcode.FORMAT_QR_CODE]
		});
	});

	var urlField = Ti.UI.createTextField({
		top: 100,
		right: 20,
		left: 20,
		height: Ti.Platform.name === 'android' ? Ti.UI.SIZE : 40,
		paddingLeft: 10,
		paddingRight: 10,
		keyboardType: Ti.UI.KEYBOARD_URL,
		autocorrect: false,
		autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE,
		hintText: 'http://',

		// FIXME: https://jira.appcelerator.org/browse/TIMOB-19124
		value: settings.url || '',

		font: {
			fontSize: 15
		},
		backgroundColor: 'white',
		color: '#333',
		borderWidth: 2,
		borderColor: '#aa1617'
	});

	// FIXME: https://jira.appcelerator.org/browse/TIMOB-19131
	// FIXME: https://jira.appcelerator.org/browse/TIMOB-19132
	var alloySwitch;

	function setAlloy(val) {
		val = !!val;
		if (CFG.OS_WINDOWS) {
			alloySwitch.applyProperties({
				value: val,
				title: val ? 'ALLOY' : 'CLASSIC',
				backgroundColor: val ? 'white' : '#aa1617',
				color: val ? '#aa1617' : 'white'
			});
		} else {
			alloySwitch.value = val;
		}
	}
	if (CFG.OS_WINDOWS) {
		alloySwitch = Ti.UI.createButton({
			top: 210,
			width: 100,
			height: 40
		});
		setAlloy(settings.alloy);
		alloySwitch.addEventListener('click', function (e) {
			setAlloy(!e.source.value);
		});
	} else {
		alloySwitch = Ti.UI.createSwitch({
			top: 160,
			left: 20,
			value: !!settings.alloy
		});
	}

	var alloyLabel = Ti.UI.createLabel({
		top: 160,
		left: 80,
		height: 30,
		verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_CENTER,
		color: 'white',
		text: 'Alloy'
	});

	var sourceBtn = Ti.UI.createButton({
		top: 210,
		left: 20,
		width: 100,
		height: 40,
		title: 'SOURCE',
		backgroundColor: '#aa1617',
		color: 'white'
	});

	sourceBtn.addEventListener('click', function onClick(e) {
		var url = urlField.value;

		if (!url) {
			return alert('URL is missing.');
		}

		Ti.Platform.openURL(url);
	});

	var loadBtn = Ti.UI.createButton({
		top: 210,
		right: 20,
		width: 100,
		height: 40,
		title: 'LOAD',
		backgroundColor: '#aa1617',
		color: 'white'
	});

	loadBtn.addEventListener('click', function onClick(e) {
		var url = urlField.value;

		if (!url) {
			return alert('URL is missing.');
		}

		if (loadingWin) {
			return alert('Already loading..');
		}

		var loadingWin = Ti.UI.createWindow({
			backgroundColor: 'black'
		});

		var loadingIndicator = Ti.UI.createActivityIndicator({
			visible: true,
			message: 'Loading...',
			color: 'white'
		});

		loadingWin.add(loadingIndicator);
		loadingWin.open({
			animated: false
		});

		settings.url = url;
		settings.alloy = alloySwitch.value;

		Ti.App.Properties.setObject('proxy::settings', settings);

		require('codebase').create(settings, function afterCreate(err) {

			// hide indicator so the loading app has a solid black background
			loadingWin.remove(loadingIndicator);
			loadingIndicator = null;

			if (err) {
				loadingWin.close();
				loadingWin = null;

				return alert(err);
			}

			// on Android, the user can navigate back
			// close loading window when it gains focus
			loadingWin.addEventListener('focus', function onFocus() {
				loadingWin.removeEventListener('focus', onFocus);

				loadingWin.close();
				loadingWin = null;
			});

		});
	});

	var instructions = Ti.UI.createLabel({
		bottom: 40,
		color: 'white',

		// FIXME: https://jira.appcelerator.org/browse/TIMOB-19048
		text: CFG.OS_IOS ? 'Shake anytime to return to this screen.' : 'Shake or use the hardware back button\nto return to this screen.',
		textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER
	});

	win.add(samplesBtn);

	// FIXME: https://jira.appcelerator.org/browse/MOD-2133
	if (!CFG.OS_WINDOWS) {
		win.add(scanBtn);
	}

	win.add(urlField);

	win.add(alloySwitch);

	if (!CFG.OS_WINDOWS) {
		win.add(alloyLabel);
	}

	win.add(sourceBtn);
	win.add(loadBtn);

	win.add(instructions);

	if (CFG.OS_ANDROID || CFG.OS_IOS) {

		function onBarcodeSuccess(e) {

			// URL
			if (e.contentType === Barcode.URL) {
				urlField.value = e.result;
				return;
			}

			// TEXT
			if (e.contentType === Barcode.TEXT) {

				// JS
				if (/Ti(tanium)?\.UI\.create/.test(e.result)) {

					// protect local scope
					(function () {
						eval(e.result);
					})();

					return;
				}

				// JSON
				try {
					var data = JSON.parse(e.result);

					if (data.url) {
						urlField.value = data.url;
					}

					if (typeof data.alloy === 'boolean') {
						alloySwitch.value = data.alloy;
					}

					return;

				} catch (e) {}
			}

			// unsupported
			return alert('QR code is no URL.');
		}

		Barcode.addEventListener('success', onBarcodeSuccess);

		// cleanup when app restarts
		win.addEventListener('close', function onClose() {
			Barcode.removeEventListener('success', onBarcodeSuccess);
		});
	}

	// update samples for first use
	updateSamples();

	return win;
};

function getSamples() {

	// update samples for next time
	updateSamples();

	return Ti.App.Properties.getList('liveviewer::samples', [{
		'label': 'Movies',
		'url': 'https://github.com/appcelerator/movies'
	}]);
}

function updateSamples() {

	xhr(CFG.SERVER_URL + '/samples.json', {

		// GitHub raw JSON returns as text/plain
		contentType: 'application/json'

	}, function (err, res) {

		if (!err) {
			Ti.App.Properties.setList('liveviewer::samples', res);
		}

	});
}
