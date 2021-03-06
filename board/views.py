from django.shortcuts import render

def home(request):
	return render(request,'board/index.html')

# Create your views here.
