import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { Readable } from 'stream';

const execPromise = promisify(exec);

@Injectable()
export class WhisperService {
  async getTranslation(audioPath: string) {
    const pythonPath = path.join('/Users/ztlab58/Desktop/learning_goal_project/src/python-services/venv/bin/python');

    const scriptPath = path.join('/Users/ztlab58/Desktop/learning_goal_project/src/python-services/transcribe.py');

    try {
      const { stdout, stderr } = await execPromise(
        `"${pythonPath}" "${scriptPath}" "${audioPath}"`,
      );

      if (stderr) {
        console.warn('Python Stderr:', stderr);
      }

      const resultObject = JSON.parse(stdout);
      const transcription = resultObject.transcription;
      const convertedText = transcription.map((segment: { start: number; end: number; text: string; }) => segment.text).join(' ');
      return convertedText;

    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Transcription failed');
    }
  }

  // getTranslationStream(audioPath: string): Readable {
  //   const pythonPath = path.join('/Users/ztlab58/Desktop/learning_goal_project/src/python-services/venv/bin/python');
  //   const scriptPath = path.join('/Users/ztlab58/Desktop/learning_goal_project/src/python-services/transcribe_stream.py');

  //   const child = spawn(pythonPath, [scriptPath, audioPath]);
  //   return child.stdout;
  // }
}