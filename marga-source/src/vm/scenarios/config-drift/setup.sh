for f in staging prod; do printf 'APP_NAME=shop\nLOG_LEVEL=info\nWORKERS=4\nDB_HOST=db1\nDB_POOL=20\nREGION=ap-south-1\nFEATURE_X=on\nSESSION_TTL=3600\nCACHE_SIZE=256\nRETRIES=3\n' > /root/$f.conf; done
sed -i 's/^CACHE_SIZE=256/CACHE_SIZE=32/' /root/prod.conf
