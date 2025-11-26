# Decision Engine Flow

This diagram illustrates the "Trust but Verify" validation pipeline that ensures every AI response meets strict safety and accuracy criteria.

```mermaid
flowchart TD
    Start([User Query]) --> Dispatcher[Dispatcher Agent<br/>Analyzes Intent]
    
    Dispatcher --> Researcher[Researcher Agent<br/>Synthesizes Data]
    
    Researcher -->|draft_answer| Validator{Parallel Validator}
    
    Validator --> Safety[Safety & Compliance Agent<br/>Reviews for Accuracy]
    Validator --> KNN[k-NN Validator Agent<br/>Confidence Scoring]
    
    Safety -->|APPROVED or Critique| Gate[Deterministic Decision Agent<br/>Code-Based Gatekeeping]
    KNN -->|Confidence Score| Gate
    
    Gate -->|validation_passed?| Decision{Both Conditions Met?<br/>Safety = APPROVED<br/>AND<br/>Confidence ≥ 0.25}
    
    Decision -->|YES| Summarizer[Session Summarizer Agent<br/>Delivers Answer]
    Decision -->|NO| Reviser[Reviser Agent<br/>Improves Draft]
    
    Reviser -->|Iteration < 3| Validator
    Reviser -->|Max Iterations| Fallback[Fallback Response<br/>Cannot Verify]
    
    Summarizer --> End([Response to User])
    Fallback --> End
    
    style Start fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
    style End fill:#34A853,stroke:#333,stroke-width:2px,color:#fff
    style Gate fill:#EA4335,stroke:#333,stroke-width:3px,color:#fff
    style Decision fill:#FBBC04,stroke:#333,stroke-width:2px
    style Summarizer fill:#34A853,stroke:#333,stroke-width:2px
    style Fallback fill:#EA4335,stroke:#333,stroke-width:2px,color:#fff
```

## Validation Criteria

### Safety Check
- **Agent**: SafetyAndComplianceAgent
- **Output**: "APPROVED" or detailed critique
- **Purpose**: Ensures response doesn't contain dangerous advice

### Technical Confidence
- **Agent**: KnnValidatorAgent
- **Method**: k-Nearest Neighbors on automotive corpus
- **Threshold**: ≥ 0.25 confidence score
- **Purpose**: Validates terminology accuracy

### Deterministic Gate
- **Type**: Code-based (no LLM)
- **Logic**: `validation_passed = (safety == "APPROVED") AND (confidence >= 0.25)`
- **Why**: Removes probabilistic uncertainty from safety-critical decisions

## Iteration Limits

- **Max Revisions**: 3 iterations
- **Fallback**: If validation fails after 3 attempts, return "Cannot verify" response
- **Purpose**: Prevents infinite loops while maintaining safety
