@echo off
echo ========================================
echo Checking Embedding Generation Progress
echo ========================================
echo.

set PYTHON="C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe"

%PYTHON% -c "import pickle, os; f='embeddings.pkl'; print(f'Embeddings file exists: {os.path.exists(f)}'); print(f'File size: {os.path.getsize(f)/(1024*1024):.2f} MB') if os.path.exists(f) else None; db=pickle.load(open(f,'rb')) if os.path.exists(f) else {}; sample=list(db.values())[0][0]['embedding'] if db and list(db.values())[0] else []; print(f'Total people: {len(db)}'); print(f'Embedding dimensions: {len(sample)}'); print(f'Model: ArcFace (512-D)' if len(sample)==512 else 'Facenet (128-D)' if len(sample)==128 else 'Unknown')"

echo.
pause
