/*
 * automated_testing.c
 *
 * Created: 23/07/2015 19:48:22
 *  Author: limpkin
 */
#include <avr/pgmspace.h>
#include <util/delay.h>
#include <avr/io.h>
#include <string.h>
#include <stdio.h>
#include "automated_testing.h"
#include "conversions.h"
#include "measurement.h"
#include "calibration.h"
#include "meas_io.h"
#include "vbias.h"
#include "dac.h"
#include "adc.h"


/*
 * Automate vbias testing
 */
void automated_vbias_testing(void)
{
    uint16_t temp_return, correct_voltage;
    uint8_t restart, peak_peak;
    char received_char = 0;
    
    while(1)
    {
        restart = FALSE;
        enable_bias_voltage(VBIAS_MIN_V);
        for (uint16_t added_v = 0; (added_v < 100) && (restart == FALSE); added_v+=10)
        {
            for (uint16_t main_v = VBIAS_MIN_V; (main_v <= get_max_vbias_voltage()) && (restart == FALSE); main_v+=100)
            {
                temp_return = update_bias_voltage(main_v + added_v);
                peak_peak = measure_peak_to_peak_on_channel(BIT_AVG_FINE, ADC_CHANNEL_VBIAS, 0);
                correct_voltage = compute_vbias_for_adc_value(get_averaged_adc_value(14));
                auttestdprintf("%d\r\n", main_v + added_v);
                auttestdprintf("%d\r\n", temp_return);
                auttestdprintf("%d\r\n", correct_voltage);
                auttestdprintf("%d\r\n", peak_peak);
                // Wait for input from the script
                scanf("%c", &received_char);
                if (received_char == '!')
                {
                    restart = TRUE;
                }
            }
        }        
    }
}

/*
 * Ramp voltage and measure the current
 */
void automated_current_testing(void)
{
    uint8_t restart, stepup_enabled = FALSE;
    char received_char = 0;
    uint16_t cur_measure;
    
    set_current_measurement_mode(CUR_MES_1X);
    setup_vbias_dac(VBIAS_MIN_DAC_VAL);
    enable_ldo();
    
    while (1)
    {
        restart = FALSE;
        for (uint16_t dac_val = VBIAS_MIN_DAC_VAL+1; (dac_val != 0) && (restart == FALSE); dac_val-=2)
        {
            update_vbias_dac(dac_val);
            _delay_ms(10);
            cur_measure = cur_measurement_loop(14);
            auttestdprintf("%d\r\n", dac_val);
            auttestdprintf("%d\r\n", cur_measure);
            // Wait for input from the script
            scanf("%c", &received_char);
            if (received_char == '!')
            {
                restart = TRUE;
            }
            // Check if we need to enable the stepup
            if ((dac_val < 3200) && (stepup_enabled == FALSE))
            {
                stepup_enabled = TRUE;
                enable_stepup();
            }
        }
    }
    
    disable_bias_voltage();
    disable_current_measurement_mode();
}