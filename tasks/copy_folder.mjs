import fs from 'fs';

class CopyFolder
{
  copy(src, dest)
  {
    try
    {
      fs.cpSync(src, dest, { recursive: true });
    }
    catch (e)
    {
      console.error('Error:', e);
      process.exitCode = 1;
    }
  }
}

const copy_folder = new CopyFolder();
copy_folder.copy(process.argv[2], process.argv[3]);
