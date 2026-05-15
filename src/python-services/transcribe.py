import sys
import json
from faster_whisper import WhisperModel

def run_transcription(file_path):
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, info = model.transcribe(file_path, task="translate")
    
    # Collect results into a list
    text_segments = [{"start": s.start, "end": s.end, "text": s.text} for s in segments]
    
    # Return as JSON string for NestJS to parse
    print(json.dumps({
        "language": info.language,
        "transcription": text_segments
    }))

if __name__ == "__main__":
    run_transcription(sys.argv[1])