"""
Printer Utilities - Simple Print Function
"""
import os
import subprocess

def check_printer_available():
    """Check if any printer is available"""
    try:
        cmd = 'powershell.exe "Get-WmiObject -Query \'SELECT * FROM Win32_Printer\' | Measure-Object | Select-Object -ExpandProperty Count"'
        result = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        count = int(result.strip())
        return count > 0
    except Exception:
        return False

def print_pdf_to_default_printer(pdf_path):
    """Print PDF file to Windows default printer"""
    try:
        if not check_printer_available():
            os.startfile(pdf_path)
            return True, "no_printer", "لا توجد طابعة. تم فتح الفاتورة."
        
        # Print the PDF
        os.startfile(pdf_path, "print")
        print(f"✅ Sent to printer: {pdf_path}")
        return True, "printed", "تم إرسال الفاتورة للطباعة بنجاح"
        
    except Exception as e:
        print(f"❌ Print error: {str(e)}")
        try:
            os.startfile(pdf_path)
            return True, "opened", f"تعذرت الطباعة. تم فتح الملف."
        except Exception as e2:
            return False, "error", f"فشل: {str(e2)}"