# CTBAL Mobile Health Integration Guide

## Overview

This guide shows how to integrate mobile applications with the CTBAL blockchain system for health data collection and tokenized rewards.

## 🏗️ Architecture

```
[Mobile App] → [CTBAL Health API] → [Blockchain] → [Token Rewards]
     ↓              ↓                    ↓              ↓
  User Input    REST Endpoints     Smart Contract   CTBAL Tokens
```

## 🚀 Quick Start

### 1. Start the API Server

```bash
# Install dependencies (already done)
npm install express cors @types/express @types/cors

# Start the health data API server
npm run api:server
```

The server will run on `http://localhost:3001` with the following endpoints:

- `GET /health` - Health check
- `POST /api/health-data` - Submit health data
- `GET /api/health-data` - Retrieve health records

### 2. Test the Integration

```bash
# Run the mobile integration demo
npm run mobile:demo

# Or test individual health data submission
npm run health:submit
```

## 📱 Mobile App Integration

### iOS Integration (Swift)

```swift
import Foundation

struct HealthData: Codable {
    let date: String
    let source: String
    let weight: Double?
    let glucose: Double?
    let insulin: Double?
    let heartRate: Int?
    let steps: Int?
    let sleepHours: Double?
    let notes: String?
    let submitToBlockchain: Bool
}

class CTBALHealthClient {
    private let baseURL = "http://localhost:3001"
    
    func submitHealthData(_ data: HealthData) async throws -> SubmissionResponse {
        let url = URL(string: "\\(baseURL)/api/health-data")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(data)
        
        let (responseData, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(SubmissionResponse.self, from: responseData)
    }
}
```

### Android Integration (Kotlin)

```kotlin
import retrofit2.http.*

data class HealthData(
    val date: String,
    val source: String,
    val weight: Double? = null,
    val glucose: Double? = null,
    val insulin: Double? = null,
    val heartRate: Int? = null,
    val steps: Int? = null,
    val sleepHours: Double? = null,
    val notes: String? = null,
    val submitToBlockchain: Boolean = true
)

interface CTBALHealthAPI {
    @POST("/api/health-data")
    suspend fun submitHealthData(@Body data: HealthData): SubmissionResponse
    
    @GET("/api/health-data")
    suspend fun getHealthData(@Query("limit") limit: Int = 10): HealthRecordsResponse
}
```

## 🔗 Platform Integrations

### Apple HealthKit Integration

```swift
import HealthKit

class HealthKitIntegration {
    private let healthStore = HKHealthStore()
    
    func requestPermissions() {
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .bodyMass)!,
            HKObjectType.quantityType(forIdentifier: .bloodGlucose)!,
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        ]
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            // Handle authorization result
        }
    }
    
    func syncToCTBAL() async {
        let weight = await getLatestWeight()
        let glucose = await getLatestGlucose()
        let steps = await getTodaySteps()
        
        let healthData = HealthData(
            date: Date().formatted(.dateTime.day().month().year()),
            source: "apple_health",
            weight: weight,
            glucose: glucose,
            steps: steps,
            submitToBlockchain: true
        )
        
        let client = CTBALHealthClient()
        try await client.submitHealthData(healthData)
    }
}
```

### Google Fit Integration

```kotlin
class GoogleFitIntegration(private val context: Context) {
    
    fun syncToCTBAL() {
        Fitness.getRecordingClient(context, GoogleSignIn.getLastSignedInAccount(context)!!)
            .subscribe(DataType.TYPE_STEP_COUNT_DELTA)
            .addOnSuccessListener {
                // Get recent health data
                val healthData = HealthData(
                    date = SimpleDateFormat("M/d/yyyy", Locale.US).format(Date()),
                    source = "google_fit",
                    steps = getStepsToday(),
                    heartRate = getLatestHeartRate(),
                    submitToBlockchain = true
                )
                
                // Submit to CTBAL
                lifecycleScope.launch {
                    try {
                        val response = ctbalAPI.submitHealthData(healthData)
                        handleResponse(response)
                    } catch (e: Exception) {
                        handleError(e)
                    }
                }
            }
    }
}
```

## 💰 Token Reward System

Health data submissions are automatically rewarded with CTBAL tokens:

- **Base reward**: 50 CTBAL for any submission
- **Weight data**: +25 CTBAL
- **Glucose + Insulin**: +50 CTBAL
- **Blood pressure**: +25 CTBAL
- **Heart rate**: +25 CTBAL
- **Steps**: +15 CTBAL
- **Sleep data**: +15 CTBAL
- **Detailed notes**: +25 CTBAL

**Maximum reward**: ~225 CTBAL per submission

## 📊 API Endpoints Detail

### POST /api/health-data

Submit health data for blockchain recording and token rewards.

**Request Body:**
```json
{
  "date": "1/19/2025",
  "source": "apple_health",
  "weight": 183,
  "glucose": 73,
  "insulin": 0,
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "heartRate": 72,
  "steps": 8453,
  "sleepHours": 7.5,
  "notes": "Morning health sync from Apple Health",
  "submitToBlockchain": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Health data submitted successfully",
  "data": {
    "localPath": "./health_data_api/health_api_1-19-2025.json",
    "txHash": "0xdf4d2869b77b05938e00fa3ba9abd1c1985ada4428c11771c7089a77bc5f282b",
    "etherscanUrl": "https://sepolia.etherscan.io/tx/0x...",
    "reward": 175,
    "dataPoints": 8
  }
}
```

### GET /api/health-data

Retrieve stored health records with pagination.

**Query Parameters:**
- `limit`: Number of records to return (default: 10)
- `source`: Filter by data source (optional)

**Response:**
```json
{
  "success": true,
  "message": "Retrieved 5 health records",
  "data": [
    {
      "date": "1/19/2025",
      "source": "apple_health",
      "weight": 183,
      "glucose": 73,
      "dataPoints": 8,
      "submittedAt": "2025-01-19T15:30:00.000Z"
    }
  ]
}
```

## 🔧 Development Workflow

### Testing Without Blockchain

For development and testing, you can submit data without blockchain interaction:

```json
{
  "date": "1/19/2025",
  "source": "test_app",
  "weight": 180,
  "submitToBlockchain": false
}
```

This stores data locally and calculates potential rewards without gas costs.

### Local Development Setup

1. **Start API Server**: `npm run api:server`
2. **Test Integration**: `npm run mobile:demo`
3. **Submit Test Data**: `npm run health:submit`
4. **Check Blockchain**: `npm run dashboard:sepolia`

## 🏥 Real-World Integration Examples

### Hospital/Clinic Integration

```javascript
// Sync patient data from EMR system
const patientData = {
  date: new Date().toLocaleDateString(),
  source: 'emr_system',
  glucose: bloodwork.glucose,
  bloodPressureSystolic: vitals.bpSys,
  bloodPressureDiastolic: vitals.bpDia,
  notes: 'Routine checkup - vitals normal',
  submitToBlockchain: true
};

await fetch('http://localhost:3001/api/health-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(patientData)
});
```

### Wearable Device Integration

```python
# Fitbit/Garmin/Samsung Watch sync
import requests
from datetime import datetime

def sync_wearable_data(device_data):
    health_payload = {
        'date': datetime.now().strftime('%m/%d/%Y'),
        'source': 'fitbit_versa',
        'heartRate': device_data['heart_rate'],
        'steps': device_data['steps'],
        'sleepHours': device_data['sleep_minutes'] / 60,
        'notes': f'Wearable sync - {device_data["activity_level"]} day',
        'submitToBlockchain': True
    }
    
    response = requests.post(
        'http://localhost:3001/api/health-data',
        json=health_payload
    )
    return response.json()
```

## 📈 Analytics and Monitoring

### View Blockchain Analytics

```bash
# Check overall system metrics
npm run dashboard:sepolia

# Query specific analytics
npm run query:sepolia:analytics

# View comprehensive report
npm run report:comprehensive
```

### Monitor API Performance

```bash
# Check system health
curl http://localhost:3001/health

# Get recent submissions
curl "http://localhost:3001/api/health-data?limit=5"
```

## 🔐 Security Considerations

1. **HTTPS**: Use HTTPS in production (configure SSL certificates)
2. **Authentication**: Add API key or OAuth authentication
3. **Rate Limiting**: Implement request rate limiting
4. **Data Validation**: Validate all health data inputs
5. **HIPAA Compliance**: Ensure compliance for healthcare data

## 🚀 Deployment

### Production API Server

```javascript
// For production, modify health-api-server.ts:
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));

// Add authentication middleware
app.use('/api', authenticateUser);
```

### Docker Deployment

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "api:server"]
```

## 🎯 Next Steps

1. **Start API Server**: `npm run api:server` 
2. **Test Integration**: `npm run mobile:demo`
3. **Build Mobile App**: Use the API endpoints shown above
4. **Configure Device Sync**: Integrate with HealthKit/Google Fit
5. **Deploy to Production**: Add authentication and HTTPS

## 📞 Support

For questions or issues with mobile integration:

1. Check API server logs
2. Test endpoints with curl/Postman
3. Verify blockchain connectivity with `npm run dashboard:sepolia`
4. Review health data format and validation rules

The CTBAL system is ready for mobile integration! The API server provides a clean REST interface for any mobile platform to submit health data and earn token rewards.