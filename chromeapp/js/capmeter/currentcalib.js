if (typeof capmeter == 'undefined') capmeter = {};
capmeter.currentcalib = capmeter.currentcalib || {};

// Current resistor value
capmeter.currentcalib.cur_res = 0;
// Current amplification
capmeter.currentcalib.cur_ampl = 0;
// Minimum/Maximum vbias
capmeter.currentcalib.minVbias = 100;
capmeter.currentcalib.maxVbias = 0;
// Mapping from actual ADC value to ideal ADC val
capmeter.currentcalib.adcToIdealAdcAgg = [];
capmeter.currentcalib.adcToIdealAdcAggNbSamples = [];


function Create2DArray(rows) 
{
	var arr = [];

	for (var i=0;i<rows;i++) 
	{
		arr[i] = [];
	}
	return arr;
}


// File written callback
capmeter.currentcalib.file_written_callback = function()
{
	console.log("File written");
}

// Get current from adc value and ampl
capmeter.currentcalib.getCurrentFromAdcAndAmpl = function(adc_val, current_ampl)
{
	return ((adc_val*1.24)/(0.2047*(1 << current_ampl)))*1e-9;
}

// Reset calibration states
capmeter.currentcalib.resetCalib = function()
{
	//
}

// Start calibration procedure
capmeter.currentcalib.startCalib = function(resistor_val, current_ampl)
{
	capmeter.currentcalib.adcToIdealAdcAggNbSamples = new Array(2048);
	capmeter.currentcalib.adcToIdealAdcAgg = new Array(2048);
	capmeter.currentcalib.cur_ampl = current_ampl;
	capmeter.currentcalib.cur_res = resistor_val;
	capmeter.currentcalib.minVbias = 100000;
	capmeter.currentcalib.maxVbias = 0;
}

// End calibration procedure
capmeter.currentcalib.stopCalib = function()
{
	// Temp vars
	var ideal_current_na;
	var ideal_adc_value;
	var min_adc_value;
	var max_adc_value;
	
	// Min/Max ADC value
	var i = 0;
	do
	{
		if(capmeter.currentcalib.adcToIdealAdcAgg[i])
		{
			min_adc_value = i;
		}
	}
	while(!capmeter.currentcalib.adcToIdealAdcAgg[i++])
	i = capmeter.currentcalib.adcToIdealAdcAgg.length - 1;
	do
	{
		if(capmeter.currentcalib.adcToIdealAdcAgg[i])
		{
			max_adc_value = i;
		}
	}
	while(!capmeter.currentcalib.adcToIdealAdcAgg[i--])
	console.log("Min ADC val: " + min_adc_value + ", max ADC val: " + max_adc_value);
	
	// Export data
	var export_csv = "ADC Val,Mapped ADC Val,Difference\r\n";

	// Compute mapping
	for(i = min_adc_value; i <= max_adc_value; i++)
	{
		// Check if we actually have a mapping
		if(capmeter.currentcalib.adcToIdealAdcAgg[i])
		{
			if(i < 1024)
			{
				capmeter.app.preferences["adcMapping1"][i] = Math.round(capmeter.currentcalib.adcToIdealAdcAgg[i] / capmeter.currentcalib.adcToIdealAdcAggNbSamples[i]);
			}
			else
			{
				capmeter.app.preferences["adcMapping2"][1024-i] = Math.round(capmeter.currentcalib.adcToIdealAdcAgg[i] / capmeter.currentcalib.adcToIdealAdcAggNbSamples[i]);				
			}			
		}
		else
		{
			if(i == 1024)
			{
				capmeter.app.preferences["adcMapping2"][0] = capmeter.app.preferences["adcMapping1"][1023];
			}
			else if(i > 1024)
			{
				capmeter.app.preferences["adcMapping2"][1024-i] = capmeter.app.preferences["adcMapping2"][1024-i-1];
			}
			else
			{
				capmeter.app.preferences["adcMapping1"][i] =  capmeter.app.preferences["adcMapping1"][i-1];
			}
		}
		//console.log(i + " mapped to " + capmeter.app.preferences.adcMapping[i]);			
	}
	
	// Complete mapping export
	for(i = 0; i < 2048; i++)
	{
		if(i < 1024)
		{
			if(capmeter.app.preferences["adcMapping1"][i] != null)
			{
				export_csv += i + "," + capmeter.app.preferences["adcMapping1"][i] + "," + (capmeter.app.preferences["adcMapping1"][i]-i) + "\r\n";
			}
		}
		else
		{
			if(capmeter.app.preferences["adcMapping2"][1024-i] != null)
			{
				export_csv += i + "," + capmeter.app.preferences["adcMapping2"][1024-i] + "," + (capmeter.app.preferences["adcMapping2"][1024-i]-i) + "\r\n";
			}			
		}		
	}
	
	// Save mapping ?
	capmeter.filehandler.selectAndSaveFileContents("export.txt", new Blob([export_csv], {type: 'text/plain'}), capmeter.currentcalib.file_written_callback);
}

// Add a new measurement
capmeter.currentcalib.addMeasurement = function(vbias_dacval, vbias, adc_cur)
{
	// Compute (ideal) current
	var measured_current = capmeter.currentcalib.getCurrentFromAdcAndAmpl(adc_cur, capmeter.currentcalib.cur_ampl);
	var ideal_current_a = (vbias / capmeter.currentcalib.cur_res) * 1e-3;
	var ideal_current_na = (vbias / capmeter.currentcalib.cur_res) * 1e6;
	var ideal_adc_value = Math.round(ideal_current_na * 0.2047 / 1.24);	
	console.log("DAC: " + vbias_dacval + ", Vbias: " + cur_calib_vbias + "mV, ADC: " + adc_cur + " (should be " + ideal_adc_value + "), current: " + capmeter.util.valueToElectronicString(measured_current, "A") + " (should be " + capmeter.util.valueToElectronicString(ideal_current_a, "A") + ")");
	
	// Store values
	if(!capmeter.currentcalib.adcToIdealAdcAgg[adc_cur])
	{
		capmeter.currentcalib.adcToIdealAdcAgg[adc_cur] = 0;
	}
	if(!capmeter.currentcalib.adcToIdealAdcAggNbSamples[adc_cur])
	{
		capmeter.currentcalib.adcToIdealAdcAggNbSamples[adc_cur] = 0;
	}
	capmeter.currentcalib.adcToIdealAdcAgg[adc_cur] += ideal_adc_value;
	capmeter.currentcalib.adcToIdealAdcAggNbSamples[adc_cur]++;
	
	// Store Min/Max Vbias
	if(capmeter.currentcalib.minVbias > vbias)
	{
		capmeter.currentcalib.minVbias = vbias;
	}
	if(capmeter.currentcalib.maxVbias < vbias)
	{
		capmeter.currentcalib.maxVbias = vbias;
	}
}










