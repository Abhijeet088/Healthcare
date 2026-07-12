import { dbAll } from './db.js';

/**
 * Checks incoming vitals for anomalies against static clinical guidelines
 * and historical standard deviation baselines.
 * 
 * @param {number} userId - The user ID.
 * @param {object} currentVitals - The newly received vital readings.
 * @returns {Promise<object>} Anomaly status and description.
 */
export async function detectAnomaly(userId, currentVitals) {
  const { 
    heart_rate, 
    spo2, 
    blood_pressure_systolic, 
    blood_pressure_diastolic, 
    temperature, 
    source_device 
  } = currentVitals;
  
  // 1. Critical Hard Threshold Checks
  if (heart_rate !== undefined && heart_rate !== null) {
    if (heart_rate > 150) {
      return {
        isAnomaly: true,
        anomalyType: 'Tachycardia',
        readingValue: heart_rate,
        rule: `Heart rate of ${heart_rate} bpm exceeds the critical threshold of 150 bpm.`
      };
    }
    if (heart_rate < 40) {
      return {
        isAnomaly: true,
        anomalyType: 'Bradycardia',
        readingValue: heart_rate,
        rule: `Heart rate of ${heart_rate} bpm is below the critical threshold of 40 bpm.`
      };
    }
  }

  if (spo2 !== undefined && spo2 !== null) {
    if (spo2 < 90) {
      return {
        isAnomaly: true,
        anomalyType: 'Hypoxia',
        readingValue: spo2,
        rule: `Oxygen saturation (SpO2) of ${spo2}% is below the safe threshold of 90%.`
      };
    }
  }

  if (temperature !== undefined && temperature !== null) {
    if (temperature > 39.5) {
      return {
        isAnomaly: true,
        anomalyType: 'Hyperthermia',
        readingValue: temperature,
        rule: `Body temperature of ${temperature}°C indicates high fever (threshold > 39.5°C).`
      };
    }
    if (temperature < 35.0) {
      return {
        isAnomaly: true,
        anomalyType: 'Hypothermia',
        readingValue: temperature,
        rule: `Body temperature of ${temperature}°C indicates hypothermia (threshold < 35.0°C).`
      };
    }
  }

  if (blood_pressure_systolic !== undefined && blood_pressure_systolic !== null) {
    if (blood_pressure_systolic > 180) {
      return {
        isAnomaly: true,
        anomalyType: 'Hypertensive Crisis',
        readingValue: blood_pressure_systolic,
        rule: `Systolic blood pressure of ${blood_pressure_systolic} mmHg is in hypertensive crisis (> 180 mmHg).`
      };
    }
  }
  
  if (blood_pressure_diastolic !== undefined && blood_pressure_diastolic !== null) {
    if (blood_pressure_diastolic > 120) {
      return {
        isAnomaly: true,
        anomalyType: 'Hypertensive Crisis',
        readingValue: blood_pressure_diastolic,
        rule: `Diastolic blood pressure of ${blood_pressure_diastolic} mmHg is in hypertensive crisis (> 120 mmHg).`
      };
    }
  }

  // 2. Direct Fall Detection
  if (currentVitals.fall_detected || source_device === 'FALL_DETECTOR') {
    return {
      isAnomaly: true,
      anomalyType: 'Fall Detected',
      readingValue: heart_rate || 0,
      rule: 'Sudden high acceleration impact matched with a lack of movement was recorded.'
    };
  }

  // 3. Statistical Moving Average and Standard Deviation baseline check
  try {
    const historical = await dbAll(
      `SELECT heart_rate FROM vitals_timeseries 
       WHERE user_id = ? AND heart_rate IS NOT NULL AND heart_rate > 0
       ORDER BY timestamp DESC LIMIT 20`,
      [userId]
    );

    if (historical && historical.length >= 5 && heart_rate) {
      const heartRates = historical.map(r => r.heart_rate);
      const count = heartRates.length;
      const sum = heartRates.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      
      const variance = heartRates.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      // Establish a minimum standard deviation to avoid hyper-sensitivity for ultra-stable pulses
      const effectiveStdDev = Math.max(stdDev, 6);

      if (Math.abs(heart_rate - avg) > 3 * effectiveStdDev) {
        return {
          isAnomaly: true,
          anomalyType: 'Statistical Anomaly',
          readingValue: heart_rate,
          rule: `Heart rate of ${heart_rate} bpm deviates abnormally (> 3σ) from your rolling baseline (${avg.toFixed(1)} ± ${effectiveStdDev.toFixed(1)} bpm).`
        };
      }
    }
  } catch (error) {
    console.error('Error fetching historical vitals for anomaly detection:', error);
  }

  return { isAnomaly: false };
}
