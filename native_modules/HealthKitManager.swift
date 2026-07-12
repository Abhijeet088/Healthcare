import Foundation
import HealthKit

class HealthKitManager {
    static let shared = HealthKitManager()
    let healthStore = HKHealthStore()
    
    // Server configurations
    private let backendURL = URL(string: "https://your-Your Health Will Partner-server.com/api/vitals")!
    private let patientUserId = 1 // Configured user ID reference
    
    private init() {}
    
    /// Requests authorizations for critical HealthKit metrics
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, NSError(domain: "com.Your Health Will Partner.ios", code: 1, userInfo: [NSLocalizedDescriptionKey: "HealthKit is not available on this device"]))
            return
        }
        
        // Define vital categories we read
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!,
            HKObjectType.quantityType(forIdentifier: .bloodPressureSystolic)!,
            HKObjectType.quantityType(forIdentifier: .bloodPressureDiastolic)!,
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .bodyTemperature)!
        ]
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            completion(success, error)
        }
    }
    
    /// Start observing heart rate changes in the background
    func startBackgroundVitalSync() {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else { return }
        
        let query = HKObserverQuery(sampleType: heartRateType, predicate: nil) { [weak self] _, completionHandler, error in
            if let error = error {
                print("Observer query error: \(error.localizedDescription)")
                completionHandler()
                return
            }
            
            // Fetch newest heart rate sample
            self?.fetchMostRecentSample(for: heartRateType) { sample in
                guard let sample = sample as? HKQuantitySample else {
                    completionHandler()
                    return
                }
                
                let heartRate = sample.quantity.doubleValue(for: HKUnit(from: "count/min"))
                self?.syncVitalsToServer(heartRate: heartRate, spo2: nil) {
                    completionHandler() // Let iOS know background task is done
                }
            }
        }
        
        healthStore.execute(query)
        healthStore.enableBackgroundDelivery(for: heartRateType, frequency: .immediate) { success, error in
            if success {
                print("Background delivery enabled for Heart Rate updates.")
            }
        }
    }
    
    /// Utility method to grab the newest sample
    private func fetchMostRecentSample(for sampleType: HKSampleType, completion: @escaping (HKSample?) -> Void) {
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: sampleType, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { _, results, error in
            guard error == nil, let results = results, let mostRecentSample = results.first else {
                completion(nil)
                return
            }
            completion(mostRecentSample)
        }
        healthStore.execute(query)
    }
    
    /// Posts raw health data payload to express API
    private func syncVitalsToServer(heartRate: Double, spo2: Double?, completion: @escaping () -> Void) {
        var request = URLRequest(url: backendURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("\(patientUserId)", forHTTPHeaderField: "x-user-id") // Developer bypass auth header
        
        let payload: [String: Any] = [
            "heartRate": heartRate,
            "spo2": spo2 ?? 98.0, // fallback/mock oxygen if nil
            "sourceDevice": "Apple HealthKit (iOS Background)",
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
        } catch {
            print("Failed to serialize HealthKit JSON payload.")
            completion()
            return
        }
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Error syncing HealthKit vitals to backend: \(error.localizedDescription)")
            } else if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 201 {
                print("Successfully synchronized Vital Metrics from HealthStore.")
            }
            completion()
        }
        task.resume()
    }
}
