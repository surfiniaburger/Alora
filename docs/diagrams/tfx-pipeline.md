# TFX Pipeline

This diagram shows the TensorFlow Extended (TFX) continuous training pipeline that keeps ML models accurate as conditions change.

```mermaid
flowchart LR
    subgraph "Data Sources"
        CSV[(Telemetry CSVs<br/>Barber Motorsports)]
        OBD[(OBD-II Data<br/>Live Vehicle)]
    end
    
    subgraph "TFX Pipeline"
        Ingest[Data Ingestion<br/>ExampleGen]
        Validate[Data Validation<br/>StatisticsGen]
        Transform[Feature Engineering<br/>Transform]
        Train[Model Trainer<br/>3 Models]
        Eval[Evaluator<br/>MSE Threshold]
        Push[Pusher<br/>Deploy to Serving]
    end
    
    subgraph "Trained Models"
        Tire[Tire Degradation<br/>Linear Regression]
        Fuel[Fuel Consumption<br/>Linear Regression]
        Pace[Pace Prediction<br/>Random Forest]
    end
    
    subgraph "Model Serving"
        Blessed[(Blessed Models<br/>serving_model/)]
        Rejected[(Rejected Models<br/>archive/)]
    end
    
    CSV --> Ingest
    OBD --> Ingest
    
    Ingest --> Validate
    Validate -->|Schema Valid| Transform
    Validate -->|Schema Invalid| Alert[Alert: Bad Data]
    
    Transform --> Train
    
    Train --> Tire
    Train --> Fuel
    Train --> Pace
    
    Tire --> Eval
    Fuel --> Eval
    Pace --> Eval
    
    Eval -->|MSE < 5.0| Push
    Eval -->|MSE ≥ 5.0| Rejected
    
    Push --> Blessed
    
    Blessed -.->|Hot Reload| MCP[MCP Server<br/>Model Serving]
    
    style Eval fill:#EA4335,stroke:#333,stroke-width:3px,color:#fff
    style Push fill:#34A853,stroke:#333,stroke-width:2px
    style Blessed fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
    style Rejected fill:#EA4335,stroke:#333,stroke-width:2px,color:#fff
    style Alert fill:#FBBC04,stroke:#333,stroke-width:2px
```

## Pipeline Components

### 1. Data Ingestion (ExampleGen)
- **Input**: Raw telemetry CSVs from Barber Motorsports Park dataset
- **Process**: Reads and splits data into train/eval sets
- **Output**: TFRecord format for efficient processing

### 2. Data Validation (StatisticsGen)
- **Purpose**: Detects anomalies and schema violations
- **Checks**:
  - Missing values
  - Out-of-range values (e.g., negative fuel)
  - Schema drift
- **Action**: Alerts if data quality issues detected

### 3. Feature Engineering (Transform)
- **Transformations**:
  - Rolling averages (e.g., avg speed over last 3 laps)
  - Normalization (scale features to 0-1 range)
  - Derived features (e.g., tire wear rate)
- **Output**: Preprocessed features ready for training

### 4. Model Trainer
Trains three specialized models simultaneously:

**a. Tire Degradation Model**
- **Algorithm**: Linear Regression
- **Features**: Lap count, lateral G-force, track temp
- **Target**: Lap time slowdown (seconds)

**b. Fuel Consumption Model**
- **Algorithm**: Linear Regression
- **Features**: RPM, throttle position, gear
- **Target**: Fuel usage per lap (liters)

**c. Pace Prediction Model**
- **Algorithm**: Random Forest (100 trees)
- **Features**: Traffic, gear, braking intensity, tire wear
- **Target**: Overall lap time (seconds)

### 5. Evaluator (Quality Gate)
- **Metric**: Mean Squared Error (MSE)
- **Threshold**: MSE < 5.0
- **Decision**:
  - **Pass**: Model marked as "Blessed" → Deploy to production
  - **Fail**: Model rejected → Keep using previous version
- **Why**: Prevents bad models from reaching production

### 6. Pusher (Deployment)
- **Action**: Copies blessed models to `serving_model/` directory
- **Trigger**: MCP Server hot-reloads new models automatically
- **Rollback**: Previous models archived for safety

## Automation

- **Trigger**: New data arrival or scheduled (daily)
- **Execution**: Cloud Run job
- **Monitoring**: Logs sent to Cloud Logging
- **Alerts**: Slack notification on pipeline failure
