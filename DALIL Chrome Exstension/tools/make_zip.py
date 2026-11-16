import os
import sys
import zipfile

def main():
    if len(sys.argv) < 3:
        print("Usage: python make_zip.py <source_dir> <output_zip>")
        sys.exit(1)
        
    source_dir = os.path.abspath(sys.argv[1])
    output_zip = os.path.abspath(sys.argv[2])
    
    os.makedirs(os.path.dirname(output_zip), exist_ok=True)
    
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, source_dir).replace('\\', '/')
                zipf.write(abs_path, rel_path)
                
    size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print(f"Created: {output_zip} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    main()
