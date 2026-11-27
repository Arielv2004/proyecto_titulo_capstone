package cl.mymedrecord.app;

import android.content.ContentValues;
import android.content.ContentResolver;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "QrDownload")
public class QrDownloadPlugin extends Plugin {
    @PluginMethod
    public void savePng(PluginCall call) {
        String name = call.getString("fileName");
        String data = call.getString("base64");
        if (name == null || data == null || !name.matches("[A-Za-z0-9_.-]+\\.png")) {
            call.reject("Nombre de archivo o imagen inválidos");
            return;
        }
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            Uri savedUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, name);
                values.put(MediaStore.Downloads.MIME_TYPE, "image/png");
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new Exception("No se pudo crear el archivo en Descargas");
                try {
                    try (OutputStream output = resolver.openOutputStream(uri)) {
                        if (output == null) throw new Exception("No se pudo abrir el archivo");
                        output.write(bytes);
                    }
                    ContentValues ready = new ContentValues();
                    ready.put(MediaStore.Downloads.IS_PENDING, 0);
                    resolver.update(uri, ready, null, null);
                } catch (Exception error) {
                    resolver.delete(uri, null, null);
                    throw error;
                }
                savedUri = uri;
            } else {
                call.reject("Esta función requiere Android 10 o superior");
                return;
            }
            JSObject result = new JSObject();
            result.put("uri", savedUri.toString());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo guardar el QR en Descargas: " + error.getMessage());
        }
    }
}
