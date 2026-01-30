# Product Guidelines - FlowCoder

## User Interaction Principles
- **Pragmatic & Technical:** FlowCoder's communication should be direct, minimal, and focused on technical efficiency.
- **No-Nonsense Feedback:** Suggestions and errors should prioritize code efficiency, performance metrics, and adherence to hardware constraints without unnecessary conversational filler.
- **Transparency:** Clearly display relevant technical details such as inference time, memory usage, and the specific quantization level being used.

## Performance Philosophy
- **Balanced & User-Controlled:** By default, FlowCoder balances inference speed with output quality to ensure a usable experience on standard CPUs.
- **User Agency:** Users have full control to adjust this balance. The system must support easy swapping of models and quantization levels (GGUF) to suit the complexity of the current task or the capabilities of the available hardware.
- **Hardware Awareness:** The system should intelligently detect available hardware (CPU vs. GPU) and recommend or default to the most appropriate configuration, but always defer to user override.
