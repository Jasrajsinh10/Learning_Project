import sys
import json
from faster_whisper import WhisperModel

def run_transcription(file_path):
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, info = model.transcribe(file_path, task="translate")
    
    # Stream each segment to stdout as it is decoded
    for segment in segments:
        segment_data = {
            "start": segment.start,
            "end": segment.end,
            "text": segment.text
        }
        print(json.dumps(segment_data))
        sys.stdout.flush()

if __name__ == "__main__":
    run_transcription(sys.argv[1])
