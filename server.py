from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import webbrowser,threading
url='http://localhost:8000'
threading.Timer(.5,lambda:webbrowser.open(url)).start()
print('CCAR-F Practice Lab:',url)
ThreadingHTTPServer(('localhost',8000),SimpleHTTPRequestHandler).serve_forever()
