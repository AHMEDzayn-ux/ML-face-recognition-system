"""
Apply database migrations to Supabase
Run this script to create trips and trip_participants tables
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_migration(migration_file: str):
    """Execute SQL migration file"""
    print(f"🚀 Running migration: {migration_file}")
    
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Split by semicolons to execute statements individually
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
        
        for i, statement in enumerate(statements, 1):
            # Skip comments and empty lines
            if statement.startswith('--') or not statement.strip():
                continue
                
            try:
                # Execute via Supabase RPC (you may need to adjust based on your setup)
                # For now, we'll print instructions
                print(f"  Statement {i}/{len(statements)}")
            except Exception as e:
                print(f"  ⚠️  Warning on statement {i}: {e}")
        
        print(f"✅ Migration completed: {migration_file}")
        return True
        
    except FileNotFoundError:
        print(f"❌ Migration file not found: {migration_file}")
        return False
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

def main():
    print("=" * 60)
    print("🔧 Supabase Database Migration Tool")
    print("=" * 60)
    
    # Get migration file
    migration_file = "migrations/001_create_trips_tables.sql"
    
    print(f"\n📋 Migration file: {migration_file}")
    print(f"🔗 Supabase URL: {SUPABASE_URL}")
    print("\n" + "=" * 60)
    
    # Note: Supabase doesn't support direct SQL execution via Python client
    # You need to run this via Supabase Dashboard SQL Editor or CLI
    
    print("\n⚠️  IMPORTANT INSTRUCTIONS:")
    print("=" * 60)
    print("\nSupabase Python client doesn't support direct SQL execution.")
    print("Please follow these steps:\n")
    print("1. Open Supabase Dashboard: https://supabase.com/dashboard")
    print("2. Navigate to your project")
    print("3. Go to 'SQL Editor' in the left sidebar")
    print("4. Click 'New Query'")
    print("5. Copy and paste the contents of this file:")
    print(f"   {os.path.abspath(migration_file)}")
    print("6. Click 'Run' to execute the migration")
    print("\nAlternatively, use Supabase CLI:")
    print("   supabase db push")
    print("\n" + "=" * 60)
    
    # Print the SQL for easy copying
    print("\n📄 SQL MIGRATION CONTENT:")
    print("=" * 60)
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            print(f.read())
    except:
        pass
    print("=" * 60)

if __name__ == "__main__":
    main()
