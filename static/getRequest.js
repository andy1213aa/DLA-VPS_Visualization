function getRequest(URL, request){
    let result;

    jQuery.ajax({ 
        async: false,
        type: "POST", 
        url: URL, 
        dataType: 'json',
        contentType:'application/json',
        data: JSON.stringify(request),
        success: function(data,textStatus,jqXHR ){         
            result=data;  
        } 
    });
    return result;
}