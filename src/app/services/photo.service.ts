import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Storage } from '@capacitor/storage';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private photoSTORAGE = 'photos';
  private platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  public async addNewToGallery() {
    //take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    //Save the picture and add it to photo collections.
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);

    //save photo to json file
    // this.photos.unshift({
    //   filepath: 'soon...',
    //   webviewPath: capturedPhoto.webPath
    // });

    Storage.set({
      key: this.photoSTORAGE,
      value: JSON.stringify(this.photos)
    });
  }

  public async loadSaved() {
    //tetrieve cached photo array data
    const photoList = await Storage.get({key: this.photoSTORAGE});
    this.photos = JSON.parse(photoList.value) || [];

    //when running on the web.
    if(this.platform.is('hybrid')){
      for (const photo of this.photos) {
        //read each saved photo's data from the filesystem
        const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });
        //web platform only
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  public async deletePicture(photo: UserPhoto, position: number){
    this.photos.splice(position, 1);

    //update photo array cache
    Storage.set({
      key: this.photoSTORAGE,
      value: JSON.stringify(this.photos)
    });

    //delete photo file from filesystem
    const filename = photo.filepath.substr(photo.filepath.lastIndexOf('/', + 1));

    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data
    });
  }

  private async savePicture(photo: Photo){
    const base64Data = await this.readAsBase64(photo);

    //write the file to the data directory
    const fileName = new Date().getTime() + 'jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    if(this.platform.is('hybrid')){
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri)
      };
    }

    return {
      filepath: fileName,
      webviewPath: photo.webPath
    };
  }

  private async readAsBase64(photo: Photo) {
    //if hybrid will detect capacitor
    if(this.platform.is('hybrid')){
      //read the file into base64 format
      const file = await Filesystem.readFile({ path: photo.path});
      return file.data;
    }
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    return await this.convertBlobToBase64(blob) as string;
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => { resolve(reader.result); };
    reader.readAsDataURL(blob);
  });

}

// export interface Photo {
//   photo: Photo;
// }

export interface UserPhoto {
  filepath: string;
  webviewPath: string;
};
